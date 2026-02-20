import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsBoolean } from "class-validator";
import { Type, Transform } from "class-transformer";
import { CampaignStatus } from "@lib/database";

export class CampaignQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  /** Filter by name (case-insensitive contains). */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter campaigns created/scheduled on or after this date (ISO). */
  @IsOptional()
  @IsString()
  dateFrom?: string;

  /** Filter campaigns created/scheduled on or before this date (ISO). */
  @IsOptional()
  @IsString()
  dateTo?: string;

  /** When true, only return saved templates (isTemplate=true). */
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isTemplate?: boolean;
}
