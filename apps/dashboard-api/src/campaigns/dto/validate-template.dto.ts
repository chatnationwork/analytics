import { IsString } from "class-validator";

export class ValidateTemplateDto {
  @IsString()
  template: string;
}
