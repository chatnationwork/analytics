import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDateString,
  MaxLength,
  ValidateNested,
  IsArray,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { CampaignType } from "@lib/database";

export class FilterConditionDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsString()
  @IsNotEmpty()
  operator: string;

  value: unknown;
}

export class AudienceFilterDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  conditions: FilterConditionDto[];

  @IsString()
  @IsNotEmpty()
  logic: "AND" | "OR";
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @IsObject()
  @IsNotEmpty()
  messageTemplate: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  audienceFilter?: AudienceFilterDto;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceModule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceReferenceId?: string;

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
}
