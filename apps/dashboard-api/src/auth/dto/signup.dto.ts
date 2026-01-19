/**
 * =============================================================================
 * SIGNUP DTO
 * =============================================================================
 * 
 * Data Transfer Object for user registration.
 * Validates all input data before it reaches the service layer.
 */

import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class SignupDto {
  /** User's email address */
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  /** 
   * Password with minimum requirements.
   * Must be at least 8 characters.
   */
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password is too long' })
  password: string;

  /** User's display name */
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100)
  name: string;

  /** 
   * Organization/tenant name.
   * A tenant will be created with this name.
   */
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(100)
  organizationName: string;

  /** 
   * Optional organization slug (URL-friendly identifier).
   * If not provided, it will be generated from the organization name.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @MaxLength(50)
  organizationSlug?: string;
}
