import { IsString, IsOptional, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AudienceFilterDto } from "./create-campaign.dto";

export class CreateSegmentDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ValidateNested()
  @Type(() => AudienceFilterDto)
  filter: AudienceFilterDto;
}

export class UpdateSegmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  filter?: AudienceFilterDto;
}
