import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsObject, IsArray, Min } from 'class-validator';
import { AlertScope } from '../alert.enums.js';

export class CreateTriggerDto {
  @IsString()
  name: string;

  @IsEnum(AlertScope)
  scope: AlertScope;

  @IsOptional()
  @IsString()
  scopeValue?: string;

  @IsString()
  targetType: string;

  @IsString()
  targetProperty: string;

  @IsString()
  conditionType: string;

  @IsObject()
  conditionValue: any;

  @IsOptional()
  @IsString()
  messageTemplate?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lookbackSeconds?: number;

  @IsOptional()
  @IsBoolean()
  autoResolveEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  autoResolveLookbackSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  noRetriggerSeconds?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationIds?: string[];
}

export class UpdateTriggerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AlertScope)
  scope?: AlertScope;

  @IsOptional()
  @IsString()
  scopeValue?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  targetProperty?: string;

  @IsOptional()
  @IsString()
  conditionType?: string;

  @IsOptional()
  @IsObject()
  conditionValue?: any;

  @IsOptional()
  @IsString()
  messageTemplate?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lookbackSeconds?: number;

  @IsOptional()
  @IsBoolean()
  autoResolveEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  autoResolveLookbackSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  noRetriggerSeconds?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationIds?: string[];
}