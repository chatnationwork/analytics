import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LibraryInfo {
  @IsString()
  name: string;

  @IsString()
  version: string;
}

class PageInfo {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

class ScreenInfo {
  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;
}

export class EventContextDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LibraryInfo)
  library?: LibraryInfo;

  @IsOptional()
  @ValidateNested()
  @Type(() => PageInfo)
  page?: PageInfo;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScreenInfo)
  screen?: ScreenInfo;

  // Phase 2 ready fields
  @IsOptional()
  @IsString()
  handshakeToken?: string;
}
