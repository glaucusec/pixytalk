import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class ConfigureAgentToolDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsObject()
  configuration!: Record<string, unknown>;
}
