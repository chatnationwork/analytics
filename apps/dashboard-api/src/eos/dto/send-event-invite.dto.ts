import {
  IsString,
  IsOptional,
  IsObject,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AudienceFilterDto } from "../../campaigns/dto/create-campaign.dto";

export class SendEventInviteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  /** Full WhatsApp template JSON for dynamic/unregistered templates. */
  @IsOptional()
  @IsObject()
  rawTemplate?: Record<string, any>;

  /**
   * Audience filter rules for selecting contacts.
   * Shape: { conditions: FilterCondition[], logic: 'AND' | 'OR' }
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  audienceFilter?: AudienceFilterDto;

  /** User-entered values for template variables (e.g. {{1}}, {{2}}). */
  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;
}
