import {
  IsString,
  IsUUID,
  IsISO8601,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventContextDto } from './event-context.dto';

export class CaptureEventDto {
  @IsUUID()
  event_id: string;

  @IsString()
  @MaxLength(100)
  event_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  event_type?: string;

  @IsISO8601()
  timestamp: string;

  @IsUUID()
  anonymous_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  user_id?: string;

  @IsUUID()
  session_id: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EventContextDto)
  context: EventContextDto;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  message_id?: string;
}

export class CaptureBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaptureEventDto)
  @ArrayMaxSize(100)
  batch: CaptureEventDto[];

  @IsISO8601()
  sent_at: string;

  @IsOptional()
  @IsString()
  write_key?: string;
}
