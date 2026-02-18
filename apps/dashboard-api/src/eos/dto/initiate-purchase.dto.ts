import {
  IsUUID,
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
} from "class-validator";

export class InitiatePurchaseDto {
  @IsUUID()
  ticketTypeId: string;

  @IsString()
  phone: string; // M-Pesa phone number

  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsEmail()
  holderEmail?: string;

  @IsOptional()
  @IsString()
  holderPhone?: string; // Contact phone if different from payment phone
}
