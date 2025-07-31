import { IsEnum, IsString, IsObject, IsOptional, IsInt, Min, Max } from 'class-validator';
import { PlatformType } from '../entities/platform-connection.entity';

export class CreatePlatformConnectionDto {
  @IsString()
  name: string;

  @IsEnum(PlatformType)
  type: PlatformType;

  @IsObject()
  connectionConfig: Record<string, any>;

  @IsOptional()
  @IsObject()
  authConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  syncSettings?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimitPerMinute?: number;
}

export class UpdatePlatformConnectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  connectionConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  authConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  syncSettings?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimitPerMinute?: number;
}