import { IsEnum, IsString, IsObject, IsOptional, IsDateString } from 'class-validator';
import { ConflictResolutionStrategy } from '../entities/data-conflict.entity';

export class CreateDataConflictDto {
  @IsString()
  dataId: string;

  @IsString()
  dataType: string;

  @IsString()
  sourcePlatformId: string;

  @IsString()
  targetPlatformId: string;

  @IsObject()
  sourceData: Record<string, any>;

  @IsObject()
  targetData: Record<string, any>;

  @IsEnum(ConflictResolutionStrategy)
  resolutionStrategy: ConflictResolutionStrategy;

  @IsDateString()
  sourceTimestamp: string;

  @IsDateString()
  targetTimestamp: string;
}

export class ResolveConflictDto {
  @IsObject()
  resolvedData: Record<string, any>;

  @IsOptional()
  @IsString()
  resolvedBy?: string;
}