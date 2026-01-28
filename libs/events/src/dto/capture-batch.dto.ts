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
import { Type, Transform } from 'class-transformer';
import { v4 as uuidv4, v5 as uuidv5, validate as uuidValidate } from 'uuid';
import { EventContextDto } from './event-context.dto';

// Namespace for hashing loose IDs (randomly generated UUID v4)
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Helper to ensure value is a valid UUID.
 * If strictly invalid, it hashes the string to a UUID v5.
 * If empty/missing, generates a new random UUID v4.
 */
function toUUID(value: any): string {
  if (!value) return uuidv4();
  if (uuidValidate(value)) return value;
  // Hash the string to ensure stability (same string = same UUID)
  return uuidv5(String(value), NAMESPACE);
}

/**
 * Helper to ensure valid ISO Date.
 * If invalid, returns current time.
 */
function toDateString(value: any): string {
  if (!value) return new Date().toISOString();
  // Check if it's already ISO string or date
  if (value instanceof Date) return value.toISOString();
  
  // Try parsing
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    // Check if it's a timestamp number
    if (!isNaN(Number(value))) {
       const tsDate = new Date(Number(value));
       if (!isNaN(tsDate.getTime())) return tsDate.toISOString();
    }
    return new Date().toISOString(); // Fallback to now
  }
  return date.toISOString();
}

export class CaptureEventDto {
  @IsString() // Relaxed from @IsUUID to allow placeholders/strings
  @Transform(({ value }) => toUUID(value))
  event_id: string;

  @IsString()
  @MaxLength(100)
  event_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  event_type?: string;

  @IsISO8601()
  @Transform(({ value }) => toDateString(value))
  timestamp: string;

  @IsString() // Relaxed
  @Transform(({ value }) => toUUID(value))
  anonymous_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  user_id?: string;

  @IsString() // Relaxed
  @Transform(({ value }) => toUUID(value))
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
  @Transform(({ value }) => toDateString(value))
  sent_at: string;

  @IsOptional()
  @IsString()
  write_key?: string;
}
