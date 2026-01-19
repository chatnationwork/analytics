import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(['write', 'read'])
  type?: 'write' | 'read';

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
