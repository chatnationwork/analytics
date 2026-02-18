import { IsOptional, IsString, IsInt, Min, IsEnum } from "class-validator";
import { Type } from "class-transformer";
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
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  sourceModule?: string;
}
