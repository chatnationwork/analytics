/**
 * =============================================================================
 * LOGIN DTO
 * =============================================================================
 *
 * Data Transfer Object for user login.
 */

import { IsEmail, IsString, MinLength } from "class-validator";

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
 * Response returned on successful login
 */
export class LoginResponseDto {
  /** JWT access token */
  accessToken: string;

  /** Token type (always 'Bearer') */
  tokenType: "Bearer";

  /** Expiry time in seconds */
  expiresIn: number;

  /** User information */
  user: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    permissions: {
      global: string[];
      team: Record<string, string[]>;
    };
  };
}
