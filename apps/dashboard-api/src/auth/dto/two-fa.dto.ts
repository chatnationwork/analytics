/**
 * DTOs for two-factor authentication (2FA).
 * Includes DTOs for login-time OTP verification, 2FA settings,
 * and post-signup phone verification (setup flow).
 */

import {
  IsString,
  IsBoolean,
  IsOptional,
  Length,
  Matches,
} from "class-validator";

/** DTO for verifying a 2FA code during login. */
export class Verify2FaDto {
  @IsString()
  twoFactorToken: string;

  @IsString()
  @Length(6, 6, { message: "Code must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "Code must be 6 digits" })
  code: string;
}

/** DTO for resending a 2FA code during login. */
export class Resend2FaDto {
  @IsString()
  twoFactorToken: string;
}

/** DTO for enabling/disabling 2FA and setting the phone number. */
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

/** DTO for sending a verification code to a phone number during 2FA setup (post-signup). */
export class SendSetupCodeDto {
  /** Phone number in digits only (e.g. 254712345678). */
  @IsString()
  @Matches(/^[0-9]{10,15}$/, {
    message: "Phone must be 10–15 digits",
  })
  phone: string;
}

/** DTO for verifying the OTP code sent during 2FA setup (post-signup). */
export class VerifySetupCodeDto {
  /** Token returned by send-setup-code endpoint. */
  @IsString()
  token: string;

  /** 6-digit verification code sent to the phone via WhatsApp. */
  @IsString()
  @Length(6, 6, { message: "Code must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "Code must be 6 digits" })
  code: string;

  /** Phone number that was verified (digits only). Sent again so backend can enable 2FA with it. */
  @IsString()
  @Matches(/^[0-9]{10,15}$/, {
    message: "Phone must be 10–15 digits",
  })
  phone: string;
}
