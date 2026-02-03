/**
 * DTOs for two-factor authentication (2FA).
 */

import {
  IsString,
  IsBoolean,
  IsOptional,
  Length,
  Matches,
} from "class-validator";

export class Verify2FaDto {
  @IsString()
  twoFactorToken: string;

  @IsString()
  @Length(6, 6, { message: "Code must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "Code must be 6 digits" })
  code: string;
}

export class Resend2FaDto {
  @IsString()
  twoFactorToken: string;
}

export class Update2FaDto {
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  /** Phone for WhatsApp (digits only, e.g. 254712345678). Required when enabling 2FA. */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,15}$/, {
    message: "Phone must be 10–15 digits",
  })
  phone?: string;
}
