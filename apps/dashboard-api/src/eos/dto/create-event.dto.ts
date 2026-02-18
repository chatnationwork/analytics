import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsObject,
} from "class-validator";

export class CreateEventDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

  @IsOptional()
  @IsString()
  virtualUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  /** Partial settings — merged with defaults on creation */
  @IsOptional()
  @IsObject()
  settings?: {
    hype_card_on_reg?: boolean;
    venue_map_config?: {
      grid: { cols: number; rows: number };
      slots: Array<{ id: string; x: number; y: number }>;
    };
  };
}
