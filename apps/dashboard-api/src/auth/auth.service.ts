/**
 * =============================================================================
 * AUTH SERVICE
 * =============================================================================
 *
 * Handles authentication business logic:
 * - User registration (signup)
 * - User login with JWT generation
 * - Password hashing with bcrypt
 */

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import {
  UserRepository,
  TenantRepository,
  TeamMemberEntity,
  validatePassword,
  getDefaultPasswordComplexity,
} from "@lib/database";
import { TwoFaVerificationEntity } from "@lib/database/entities/two-fa-verification.entity";
import { RbacService } from "../agent-system/rbac.service";
import { PresenceService } from "../agent-system/presence.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SignupDto,
  LoginDto,
  LoginResponseDto,
  Verify2FaDto,
  Update2FaDto,
  Resend2FaDto,
} from "./dto";

/** JWT payload structure */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  iat?: number; // Issued at
  exp?: number; // Expiry
}

/** Authenticated user info attached to request */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  permissions: {
    global: string[];
    team: Record<string, string[]>;
  };
  /** When true, org requires 2FA but user has not set it; client must redirect to 2FA setup. */
  twoFactorSetupRequired?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  private readonly TWO_FA_CODE_TTL_MINUTES = 10;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
    @InjectRepository(TeamMemberEntity)
    private readonly teamMemberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(TwoFaVerificationEntity)
    private readonly twoFaRepo: Repository<TwoFaVerificationEntity>,
    private readonly rbacService: RbacService,
    private readonly jwtService: JwtService,
    private readonly presenceService: PresenceService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Register a new user with their organization.
   * Creates both the user and a default tenant.
   */
  async signup(dto: SignupDto): Promise<LoginResponseDto> {
    // Check if email already exists
    const existingUser = await this.userRepository.emailExists(dto.email);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    // Generate slug from organization name if not provided
    const slug =
      dto.organizationSlug ?? this.generateSlug(dto.organizationName);

    // Check if slug is available
    const slugExists = await this.tenantRepository.slugExists(slug);
    if (slugExists) {
      throw new ConflictException("This organization slug is already taken");
    }

    // Enforce password complexity (min length + uppercase, lowercase, number, special)
    const signupPasswordConfig = {
      ...getDefaultPasswordComplexity(),
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: true,
    };
    const pwdResult = validatePassword(dto.password, signupPasswordConfig);
    if (!pwdResult.valid) {
      throw new BadRequestException(
        pwdResult.message ?? "Password does not meet requirements",
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user (passwordChangedAt for expiry tracking)
    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      passwordChangedAt: new Date(),
    });

    // Create tenant with user as owner
    await this.tenantRepository.createWithOwner(
      {
        name: dto.organizationName,
        slug,
      },
      user.id,
    );

    this.logger.log(`New user registered: ${user.email}`);

    // Return login response
    return await this.generateLoginResponse(user);
  }

  /**
   * Authenticate user and return JWT, or require 2FA code when enabled.
   */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.twoFactorEnabled) {
      if (!user.phone || user.phone.trim() === "") {
        throw new BadRequestException(
          "2FA is enabled but no phone number is set. Contact support.",
        );
      }
      const tenants = await this.tenantRepository.findByUserId(user.id);
      const tenantId = tenants[0]?.id;
      if (!tenantId) {
        throw new BadRequestException("User has no organization.");
      }
      const code = this.generateSixDigitCode();
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + this.TWO_FA_CODE_TTL_MINUTES,
      );

      await this.twoFaRepo.save({
        token,
        userId: user.id,
        code,
        expiresAt,
      });

      const sendResult = await this.whatsappService.sendTwoFactorCode(
        tenantId,
        user.phone,
        code,
      );
      if (!sendResult.success) {
        this.logger.warn(
          `Failed to send 2FA code to ${user.email}: ${sendResult.error}`,
        );
        throw new BadRequestException(
          sendResult.error ??
            "Could not send code to WhatsApp. Check CRM setup.",
        );
      }

      this.logger.log(`2FA code sent to ${user.email}`);
      return {
        requiresTwoFactor: true,
        twoFactorToken: token,
      };
    }

    const tenants = await this.tenantRepository.findByUserId(user.id);
    const activeTenant = tenants[0];

    // If tenant has password expiry, force change when stale
    const expiryDays =
      activeTenant?.settings?.passwordExpiryDays != null
        ? Number(activeTenant.settings.passwordExpiryDays)
        : null;
    const changedAt = user.passwordChangedAt ?? null;
    if (expiryDays != null && expiryDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - expiryDays);
      if (changedAt == null || changedAt < cutoff) {
        const changePasswordToken = this.jwtService.sign(
          { sub: user.id, email: user.email, mustChangePassword: true },
          { expiresIn: "5m" },
        );
        this.logger.log(`Password expired for ${user.email}; requiring change`);
        return {
          requiresPasswordChange: true,
          changePasswordToken,
        };
      }
    }

    await this.userRepository.updateLastLogin(user.id);
    if (activeTenant) {
      await this.presenceService
        .goOnline(activeTenant.id, user.id)
        .catch((err) =>
          this.logger.warn(`Failed to set presence online: ${err?.message}`),
        );
    }

    this.logger.log(`User logged in: ${user.email}`);
    return await this.generateLoginResponse(user);
  }

  /**
   * Verify 2FA code and return full login response.
   */
  async verifyTwoFactor(dto: Verify2FaDto): Promise<LoginResponseDto> {
    const row = await this.twoFaRepo.findOne({
      where: { token: dto.twoFactorToken },
      relations: ["user"],
    });
    if (!row) {
      throw new UnauthorizedException(
        "Invalid or expired code. Please log in again.",
      );
    }
    if (new Date() > row.expiresAt) {
      await this.twoFaRepo.delete({ id: row.id });
      throw new UnauthorizedException("Code expired. Please log in again.");
    }
    if (row.code !== dto.code) {
      throw new UnauthorizedException("Invalid code.");
    }

    await this.twoFaRepo.delete({ id: row.id });

    const user = row.user;
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    await this.userRepository.updateLastLogin(user.id);
    const tenants = await this.tenantRepository.findByUserId(user.id);
    if (tenants.length > 0) {
      await this.presenceService
        .goOnline(tenants[0].id, user.id)
        .catch((err) =>
          this.logger.warn(`Failed to set presence online: ${err?.message}`),
        );
    }

    this.logger.log(`User logged in (2FA): ${user.email}`);
    return await this.generateLoginResponse(user);
  }

  /**
   * Resend 2FA code for the same login attempt. Invalidates the previous code.
   */
  async resendTwoFactorCode(dto: Resend2FaDto): Promise<{ success: boolean }> {
    const row = await this.twoFaRepo.findOne({
      where: { token: dto.twoFactorToken },
      relations: ["user"],
    });
    if (!row) {
      throw new UnauthorizedException(
        "Invalid or expired. Please log in again.",
      );
    }
    if (new Date() > row.expiresAt) {
      await this.twoFaRepo.delete({ id: row.id });
      throw new UnauthorizedException("Code expired. Please log in again.");
    }

    const newCode = this.generateSixDigitCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.TWO_FA_CODE_TTL_MINUTES);

    await this.twoFaRepo.update(row.id, { code: newCode, expiresAt });

    const user = row.user;
    if (!user?.phone) {
      throw new BadRequestException("User phone not set.");
    }
    const tenants = await this.tenantRepository.findByUserId(user.id);
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      throw new BadRequestException("User has no organisation.");
    }

    const sendResult = await this.whatsappService.sendTwoFactorCode(
      tenantId,
      user.phone,
      newCode,
    );
    if (!sendResult.success) {
      this.logger.warn(
        `Failed to resend 2FA code to ${user.email}: ${sendResult.error}`,
      );
      throw new BadRequestException(
        sendResult.error ?? "Could not send code to WhatsApp.",
      );
    }

    this.logger.log(`2FA code resent to ${user.email}`);
    return { success: true };
  }

  /**
   * Get 2FA status for current user (masked phone).
   */
  async getTwoFactorStatus(userId: string): Promise<{
    twoFactorEnabled: boolean;
    phone: string | null;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { twoFactorEnabled: false, phone: null };
    }
    const phone = user.phone ? this.maskPhone(user.phone) : null;
    return {
      twoFactorEnabled: !!user.twoFactorEnabled,
      phone,
    };
  }

  /**
   * Enable or disable 2FA and set phone. Phone required when enabling.
   */
  async updateTwoFactor(
    userId: string,
    dto: Update2FaDto,
  ): Promise<{ twoFactorEnabled: boolean; phone: string | null }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const tenants = await this.tenantRepository.findByUserId(userId);
    const activeTenant = tenants[0];
    const twoFactorRequired =
      activeTenant?.settings && "twoFactorRequired" in activeTenant.settings
        ? !!activeTenant.settings.twoFactorRequired
        : false;

    const twoFactorEnabled = dto.twoFactorEnabled ?? user.twoFactorEnabled;
    let phone =
      dto.phone !== undefined ? this.normalizePhone(dto.phone) : user.phone;

    if (twoFactorRequired && !twoFactorEnabled) {
      throw new BadRequestException(
        "Your organization requires two-factor authentication. You cannot disable 2FA.",
      );
    }

    if (twoFactorEnabled && (!phone || phone.length < 10)) {
      throw new BadRequestException(
        "A phone number (10–15 digits) is required to enable two-factor authentication.",
      );
    }

    if (!twoFactorEnabled) {
      phone = null;
    }

    await this.userRepository.update(userId, {
      twoFactorEnabled,
      phone,
    });

    return {
      twoFactorEnabled,
      phone: phone ? this.maskPhone(phone) : null,
    };
  }

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length <= 4) return "****";
    return "*".repeat(digits.length - 4) + digits.slice(-4);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "").trim();
  }

  /**
   * Change password (e.g. when expired or from settings).
   * Validates current password and new password against tenant complexity; updates user and returns new login response.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<LoginResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    const tenants = await this.tenantRepository.findByUserId(userId);
    const tenant = tenants[0];
    const config = tenant?.settings?.passwordComplexity ?? null;
    const result = validatePassword(newPassword, config);
    if (!result.valid) {
      throw new BadRequestException(
        result.message ?? "New password does not meet requirements",
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.userRepository.update(userId, {
      passwordHash,
      passwordChangedAt: new Date(),
    });
    const updated = await this.userRepository.findById(userId);
    if (!updated) throw new UnauthorizedException("User not found");
    return this.generateLoginResponse(updated);
  }

  /**
   * Logout: set agent presence to offline.
   * Call this when the user explicitly logs out so they stop receiving assignments.
   */
  async logout(tenantId: string, userId: string): Promise<void> {
    await this.presenceService
      .goOffline(tenantId, userId)
      .catch((err) =>
        this.logger.warn(`Failed to set presence offline: ${err?.message}`),
      );
  }

  /**
   * Get user by ID (for JWT validation).
   */
  async validateUser(userId: string): Promise<AuthUser | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    const tenants = await this.tenantRepository.findByUserId(userId);
    const activeTenant = tenants[0]; // For now, simple multi-tenancy (first tenant)

    if (!activeTenant) {
      // Should rarely happen as signup creates tenant
      this.logger.warn(`User ${userId} has no tenants`);
      return null;
    }

    const permissions = await this.getUserPermissions(user.id);
    const twoFactorRequired =
      (activeTenant.settings as { twoFactorRequired?: boolean } | undefined)
        ?.twoFactorRequired === true;
    const twoFactorSetupRequired = twoFactorRequired && !user.twoFactorEnabled;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      tenantId: activeTenant.id,
      permissions,
      twoFactorSetupRequired: twoFactorSetupRequired || undefined,
    };
  }

  /**
   * Generate JWT and login response.
   */
  /**
   * Generate JWT and login response.
   */
  private async generateLoginResponse(user: {
    id: string;
    email: string;
    name?: string | null;
  }): Promise<LoginResponseDto> {
    // Determine expiration based on tenant settings
    const tenants = await this.tenantRepository.findByUserId(user.id);
    const activeTenant = tenants[0];

    // Default: 7 days in minutes
    let maxDurationMinutes = 10080;

    if (
      activeTenant &&
      activeTenant.settings &&
      activeTenant.settings.session
    ) {
      maxDurationMinutes =
        activeTenant.settings.session.maxDurationMinutes || 10080;
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    // Sign with dynamic expiration
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${maxDurationMinutes}m`,
    });

    // Calculate seconds for response
    const expiresIn = maxDurationMinutes * 60;

    const permissions = await this.getUserPermissions(user.id);

    const tenantId = activeTenant?.id ?? "";
    const fullUser = await this.userRepository.findById(user.id);
    const twoFactorRequired =
      activeTenant?.settings && "twoFactorRequired" in activeTenant.settings
        ? !!activeTenant.settings.twoFactorRequired
        : false;
    const twoFactorSetupRequired =
      twoFactorRequired && !(fullUser?.twoFactorEnabled === true);

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? "",
        tenantId,
        permissions,
        twoFactorSetupRequired,
      },
    };
  }

  /**
   * Fetch permissions for a user.
   */
  async getUserPermissions(
    userId: string,
  ): Promise<{ global: string[]; team: Record<string, string[]> }> {
    // 1. Get Global Permissions
    const tenants = await this.tenantRepository.findByUserId(userId);
    const activeTenant = tenants[0];
    let globalPermissions: string[] = [];

    if (activeTenant) {
      const globalRole = await this.tenantRepository.getUserRole(
        userId,
        activeTenant.id,
      );
      if (globalRole) {
        globalPermissions =
          await this.rbacService.getPermissionsForRole(globalRole);
      }
    }

    // 2. Get Team Permissions
    const teamMemberships = await this.teamMemberRepo.find({
      where: { userId },
    });
    const teamPermissions: Record<string, string[]> = {};

    for (const membership of teamMemberships) {
      const perms = await this.rbacService.getPermissionsForRole(
        membership.role,
      );
      teamPermissions[membership.teamId] = perms;
    }

    return { global: globalPermissions, team: teamPermissions };
  }

  /**
   * Generate URL-friendly slug from organization name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
  }
}
