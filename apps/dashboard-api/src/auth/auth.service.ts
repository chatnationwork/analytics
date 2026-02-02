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
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {
  UserRepository,
  TenantRepository,
  TeamMemberEntity,
} from "@lib/database";
import { RbacService } from "../agent-system/rbac.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SignupDto, LoginDto, LoginResponseDto } from "./dto";

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
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
    @InjectRepository(TeamMemberEntity)
    private readonly teamMemberRepo: Repository<TeamMemberEntity>,
    private readonly rbacService: RbacService,
    private readonly jwtService: JwtService,
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

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user
    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
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
   * Authenticate user and return JWT.
   */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Update last login time
    await this.userRepository.updateLastLogin(user.id);

    this.logger.log(`User logged in: ${user.email}`);

    return await this.generateLoginResponse(user);
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

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      tenantId: activeTenant.id,
      permissions,
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
