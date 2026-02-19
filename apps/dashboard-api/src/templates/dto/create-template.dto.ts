import { IsString, IsNotEmpty, IsOptional, IsJSON } from "class-validator";

export class CreateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsNotEmpty()
  structure: any; // Using any here because it can be an object or string, usage will validate
}
