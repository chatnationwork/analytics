import { IsEmail, IsString, MinLength } from "class-validator";

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1, { message: "Reset token is required" })
  token: string;

  @IsString()
  @MinLength(1, { message: "New password is required" })
  newPassword: string;
}
