import { IsEnum, IsString, IsOptional, IsObject, IsInt, Min } from 'class-validator';
import { SyncJobType } from '../entities/sync-job.entity';

export class CreateSyncJobDto {
  @IsEnum(SyncJobType)
  type: SyncJobType;

  @IsString()
  platformId: string;

  @IsString()
  dataType: string;

  @IsOptional()
  @IsObject()
  syncConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateSyncJobDto {
  @IsOptional()
  @IsObject()
  syncConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  retryCount?: number;
}