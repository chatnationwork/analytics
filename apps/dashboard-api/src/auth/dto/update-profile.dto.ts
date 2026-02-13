import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
