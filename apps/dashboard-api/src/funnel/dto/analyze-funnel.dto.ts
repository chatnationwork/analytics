
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';

export class FunnelStepDto {
  @IsString()
  name: string;

  @IsString()
  eventName: string;

  @IsOptional()
  filters?: Record<string, string>;
}

export class AnalyzeFunnelDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunnelStepDto)
  steps: FunnelStepDto[];
}
