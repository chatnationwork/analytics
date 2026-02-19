import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateExhibitorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  boothNumber?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsString()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;
}
