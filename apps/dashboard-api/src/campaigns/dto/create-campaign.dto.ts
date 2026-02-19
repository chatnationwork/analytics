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
  Allow,
  IsInt,
  Min,
  Max,
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

  @Allow()
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

export class RecurrenceConfigDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(["daily", "weekly", "monthly", "yearly"])
  frequency: "daily" | "weekly" | "monthly" | "yearly";

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  @IsNotEmpty()
  time: string; // HH:mm

  @IsOptional()
  @IsArray()
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  monthOfYear?: number;
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
  @IsOptional() // Made optional because it can be derived from templateId
  messageTemplate?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;

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
  @ValidateNested()
  @Type(() => RecurrenceConfigDto)
  recurrence?: RecurrenceConfigDto;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  triggerType?: string;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;
}
