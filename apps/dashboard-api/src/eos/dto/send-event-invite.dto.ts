import { IsString, IsOptional, IsObject, IsUUID } from "class-validator";

export class SendEventInviteDto {
  @IsString()
  name: string;

  @IsUUID()
  templateId: string;

  /**
   * Audience filter rules for selecting contacts.
   * Shape: { conditions: FilterCondition[], logic: 'AND' | 'OR' }
   */
  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, any>;

  /** User-entered values for template variables (e.g. {{1}}, {{2}}). */
  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;
}
