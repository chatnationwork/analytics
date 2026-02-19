import {
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AudienceFilterDto } from "./create-campaign.dto";

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsObject()
  messageTemplate?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  audienceFilter?: AudienceFilterDto;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  triggerType?: string;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;
}
