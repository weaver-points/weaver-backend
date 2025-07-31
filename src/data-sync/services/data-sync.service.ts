import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncJobEntity, SyncJobStatus, SyncJobType } from '../entities/sync-job.entity';
import { SyncHistoryEntity, SyncOperation } from '../entities/sync-history.entity';
import { CreateSyncJobDto, UpdateSyncJobDto } from '../dto/sync-job.dto';
import { ConflictResolutionService } from './conflict-resolution.service';
import { PlatformConnectorService } from './platform-connector.service';
import { ConflictResolutionStrategy } from '../entities/data-conflict.entity';
import { createHash } from 'crypto';

@Injectable()
export class DataSyncService {
  private readonly logger = new Logger(DataSyncService.name);

  constructor(
    @InjectRepository(SyncJobEntity)
    private syncJobRepository: Repository<SyncJobEntity>,
    @InjectRepository(SyncHistoryEntity)
    private syncHistoryRepository: Repository<SyncHistoryEntity>,
    private conflictResolutionService: ConflictResolutionService,
    private platformConnectorService: PlatformConnectorService,
  ) {}

  async createSyncJob(createSyncJobDto: CreateSyncJobDto): Promise<SyncJobEntity> {
    const syncJob = this.syncJobRepository.create(createSyncJobDto);
    return this.syncJobRepository.save(syncJob);
  }

  async updateSyncJob(id: string, updateSyncJobDto: UpdateSyncJobDto): Promise<SyncJobEntity> {
    const syncJob = await this.findSyncJobById(id);
    Object.assign(syncJob, updateSyncJobDto);
    return this.syncJobRepository.save(syncJob);
  }

  async findSyncJobById(id: string): Promise<SyncJobEntity> {
    const syncJob = await this.syncJobRepository.findOne({ where: { id } });
    if (!syncJob) {
      throw new NotFoundException(`Sync job with ID ${id} not found`);
    }
    return syncJob;
  }

  async getAllSyncJobs(): Promise<SyncJobEntity[]> {
    return this.syncJobRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async executeSyncJob(jobId: string): Promise<void> {
    const syncJob = await this.findSyncJobById(jobId);
    
    try {
      await this.updateSyncJobStatus(jobId, SyncJobStatus.RUNNING);
      syncJob.startedAt = new Date();
      await this.syncJobRepository.save(syncJob);

      this.logger.log(`Starting sync job ${jobId} for platform ${syncJob.platformId}`);

      switch (syncJob.type) {
        case SyncJobType.FULL_SYNC:
          await this.performFullSync(syncJob);
          break;
        case SyncJobType.INCREMENTAL:
          await this.performIncrementalSync(syncJob);
          break;
        case SyncJobType.CONFLICT_RESOLUTION:
          await this.performConflictResolutionSync(syncJob);
          break;
      }

      await this.updateSyncJobStatus(jobId, SyncJobStatus.COMPLETED);
      syncJob.completedAt = new Date();
      await this.syncJobRepository.save(syncJob);

      this.logger.log(`Completed sync job ${jobId}`);
    } catch (error) {
      this.logger.error(`Sync job ${jobId} failed: ${error.message}`, error.stack);
      await this.updateSyncJobStatus(jobId, SyncJobStatus.FAILED, error.message);
      syncJob.retryCount += 1;
      await this.syncJobRepository.save(syncJob);
    }
  }

  private async updateSyncJobStatus(jobId: string, status: SyncJobStatus, errorMessage?: string): Promise<void> {
    await this.syncJobRepository.update(jobId, {
      status,
      errorMessage: errorMessage ?? undefined,
    });
  }

  private async performFullSync(syncJob: SyncJobEntity): Promise<void> {
    const connector = await this.platformConnectorService.getConnector(syncJob.platformId);
    const data = await connector.fetchAllData(syncJob.dataType);

    for (const item of data) {
      await this.syncDataItem(syncJob, item, SyncOperation.CREATE);
    }
  }

  private async performIncrementalSync(syncJob: SyncJobEntity): Promise<void> {
    const connector = await this.platformConnectorService.getConnector(syncJob.platformId);
    const lastSync = syncJob.metadata?.lastSyncTimestamp;
    const data = await connector.fetchIncrementalData(syncJob.dataType, lastSync);

    for (const item of data) {
      const operation = await this.determineOperation(item);
      await this.syncDataItem(syncJob, item, operation);
    }
  }

  private async performConflictResolutionSync(syncJob: SyncJobEntity): Promise<void> {
    const conflicts = await this.conflictResolutionService.getPendingConflicts();
    
    for (const conflict of conflicts) {
      await this.conflictResolutionService.resolveConflict(conflict.id);
    }
  }

  private async syncDataItem(syncJob: SyncJobEntity, data: any, operation: SyncOperation): Promise<void> {
    const checksum = this.calculateChecksum(data);
    const version = await this.getNextVersion(data.id, syncJob.dataType);

    // Check for conflicts
    const existingData = await this.getExistingData(data.id, syncJob.dataType);
    if (existingData && this.hasConflict(existingData, data)) {
      await this.conflictResolutionService.createConflict({
        dataId: data.id,
        dataType: syncJob.dataType,
        sourcePlatformId: syncJob.platformId,
        targetPlatformId: 'main',
        sourceData: data,
        targetData: existingData,
        resolutionStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
        sourceTimestamp: new Date().toISOString(),
        targetTimestamp: existingData.updatedAt.toISOString(),
      });
      return;
    }

    // Create sync history record
    const syncHistory = this.syncHistoryRepository.create({
      syncJobId: syncJob.id,
      dataId: data.id,
      dataType: syncJob.dataType,
      operation,
      platformId: syncJob.platformId,
      beforeData: existingData,
      afterData: data,
      version,
      checksum,
      metadata: { syncedAt: new Date() },
    });

    await this.syncHistoryRepository.save(syncHistory);
  }

  private calculateChecksum(data: any): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  private async getNextVersion(dataId: string, dataType: string): Promise<number> {
    const lastHistory = await this.syncHistoryRepository.findOne({
      where: { dataId, dataType },
      order: { version: 'DESC' },
    });

    return lastHistory ? Number(lastHistory.version) + 1 : 1;
  }

  private async getExistingData(dataId: string, dataType: string): Promise<any> {
    // This would typically fetch from your main data store
    // Implementation depends on your specific data storage strategy
    return null;
  }

  private hasConflict(existingData: any, newData: any): boolean {
    // Simple conflict detection based on timestamps
    if (!existingData.updatedAt || !newData.updatedAt) {
      return false;
    }

    const existingTime = new Date(existingData.updatedAt).getTime();
    const newTime = new Date(newData.updatedAt).getTime();
    
    // Consider it a conflict if both were modified within a small time window
    const timeDiff = Math.abs(existingTime - newTime);
    return timeDiff < 60000; // 1 minute threshold
  }

  private async determineOperation(data: any): Promise<SyncOperation> {
    const existing = await this.getExistingData(data.id, data.type);
    
    if (!existing) {
      return SyncOperation.CREATE;
    }
    
    if (data.deleted) {
      return SyncOperation.DELETE;
    }
    
    return SyncOperation.UPDATE;
  }

  async getSyncHistory(dataId: string, dataType: string): Promise<SyncHistoryEntity[]> {
    return this.syncHistoryRepository.find({
      where: { dataId, dataType },
      order: { version: 'DESC' },
    });
  }

  async rollbackToVersion(dataId: string, dataType: string, version: number): Promise<void> {
    const historyRecord = await this.syncHistoryRepository.findOne({
      where: { dataId, dataType, version },
    });

    if (!historyRecord) {
      throw new NotFoundException(`Version ${version} not found for data ${dataId}`);
    }

    // Create a new sync job for rollback
    const rollbackJob = await this.createSyncJob({
      type: SyncJobType.INCREMENTAL,
      platformId: 'system',
      dataType,
      metadata: {
        rollbackTo: version,
        originalDataId: dataId,
      },
    });

    await this.executeSyncJob(rollbackJob.id);
  }
} 