import { IsString, IsIn, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateIntegrationDto {
  @IsString()
  name: string;

  @IsIn(['teams', 'slack', 'discord', 'webhook'] as const)
  type: 'teams' | 'slack' | 'discord' | 'webhook';

  @IsObject()
  config: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  sendAllAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  sendAllAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}