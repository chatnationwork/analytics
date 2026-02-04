/**
 * =============================================================================
 * LOGIN DTO
 * =============================================================================
 *
 * Data Transfer Object for user login.
 */

import { IsEmail, IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: "Current password is required" })
  currentPassword: string;

  @IsString()
  @MinLength(1, { message: "New password is required" })
  newPassword: string;
}

export class LoginDto {
  /** User's email address */
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  /** User's password */
  @IsString()
  @MinLength(1, { message: "Password is required" })
  password: string;
}

/**
 * Response returned on successful login (or 2FA required).
 */
export class LoginResponseDto {
  /** JWT access token (omitted when requiresTwoFactor is true) */
  accessToken?: string;

  /** Token type (always 'Bearer') */
  tokenType?: "Bearer";

  /** Expiry time in seconds */
  expiresIn?: number;

  /** User information (omitted when requiresTwoFactor is true) */
  user?: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    permissions: {
      global: string[];
      team: Record<string, string[]>;
    };
  };

  /** When true, client must submit twoFactorToken + code to POST /auth/2fa/verify */
  requiresTwoFactor?: boolean;

  /** One-time token to send with the 6-digit code in 2FA verify step */
  twoFactorToken?: string;

  /** When true, password has expired; client must redirect to change-password with changePasswordToken */
  requiresPasswordChange?: boolean;

  /** Short-lived token (Bearer) for POST /auth/change-password when requiresPasswordChange is true */
  changePasswordToken?: string;
}
