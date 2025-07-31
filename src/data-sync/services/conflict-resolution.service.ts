import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataConflictEntity, ConflictStatus, ConflictResolutionStrategy } from '../entities/data-conflict.entity';
import { CreateDataConflictDto, ResolveConflictDto } from '../dto/data-conflict.dto';

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  constructor(
    @InjectRepository(DataConflictEntity)
    private conflictRepository: Repository<DataConflictEntity>,
  ) {}

  async createConflict(createConflictDto: CreateDataConflictDto): Promise<DataConflictEntity> {
    const conflict = this.conflictRepository.create({
      ...createConflictDto,
      sourceTimestamp: new Date(createConflictDto.sourceTimestamp),
      targetTimestamp: new Date(createConflictDto.targetTimestamp),
    });

    const savedConflict = await this.conflictRepository.save(conflict);
    this.logger.warn(`Conflict detected for data ${conflict.dataId} between platforms ${conflict.sourcePlatformId} and ${conflict.targetPlatformId}`);
    
    // Auto-resolve if strategy allows
    if (this.canAutoResolve(conflict.resolutionStrategy)) {
      await this.autoResolveConflict(savedConflict);
    }

    return savedConflict;
  }

  async resolveConflict(conflictId: string, resolveDto?: ResolveConflictDto): Promise<DataConflictEntity> {
    const conflict = await this.findConflictById(conflictId);
    
    if (conflict.status === ConflictStatus.RESOLVED) {
      this.logger.warn(`Conflict ${conflictId} is already resolved`);
      return conflict;
    }

    let resolvedData: Record<string, any>;

    if (resolveDto) {
      resolvedData = resolveDto.resolvedData;
      conflict.resolvedBy = resolveDto.resolvedBy || 'manual';
    } else {
      resolvedData = await this.applyResolutionStrategy(conflict);
      conflict.resolvedBy = 'automatic';
    }

    conflict.resolvedData = resolvedData;
    conflict.status = ConflictStatus.RESOLVED;
    conflict.resolvedAt = new Date();

    const resolved = await this.conflictRepository.save(conflict);
    this.logger.log(`Conflict ${conflictId} resolved using strategy: ${conflict.resolutionStrategy}`);
    
    return resolved;
  }

  async findConflictById(id: string): Promise<DataConflictEntity> {
    const conflict = await this.conflictRepository.findOne({ where: { id } });
    if (!conflict) {
      throw new NotFoundException(`Conflict with ID ${id} not found`);
    }
    return conflict;
  }

  async getPendingConflicts(): Promise<DataConflictEntity[]> {
    return this.conflictRepository.find({
      where: { status: ConflictStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async getConflictsByDataId(dataId: string): Promise<DataConflictEntity[]> {
    return this.conflictRepository.find({
      where: { dataId },
      order: { createdAt: 'DESC' },
    });
  }

  private canAutoResolve(strategy: ConflictResolutionStrategy): boolean {
    return [
      ConflictResolutionStrategy.LAST_WRITE_WINS,
      ConflictResolutionStrategy.FIRST_WRITE_WINS,
      ConflictResolutionStrategy.MERGE,
    ].includes(strategy);
  }

  private async autoResolveConflict(conflict: DataConflictEntity): Promise<void> {
    try {
      await this.resolveConflict(conflict.id);
    } catch (error) {
      this.logger.error(`Failed to auto-resolve conflict ${conflict.id}: ${error.message}`);
      conflict.status = ConflictStatus.MANUAL_REVIEW;
      await this.conflictRepository.save(conflict);
    }
  }

  private async applyResolutionStrategy(conflict: DataConflictEntity): Promise<Record<string, any>> {
    switch (conflict.resolutionStrategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return conflict.sourceTimestamp > conflict.targetTimestamp 
          ? conflict.sourceData 
          : conflict.targetData;

      case ConflictResolutionStrategy.FIRST_WRITE_WINS:
        return conflict.sourceTimestamp < conflict.targetTimestamp 
          ? conflict.sourceData 
          : conflict.targetData;

      case ConflictResolutionStrategy.MERGE:
        return this.mergeData(conflict.sourceData, conflict.targetData, conflict);

      case ConflictResolutionStrategy.MANUAL:
        conflict.status = ConflictStatus.MANUAL_REVIEW;
        await this.conflictRepository.save(conflict);
        throw new Error('Manual resolution required');

      default:
        throw new Error(`Unknown resolution strategy: ${conflict.resolutionStrategy}`);
    }
  }

  private mergeData(sourceData: Record<string, any>, targetData: Record<string, any>, conflict: DataConflictEntity): Record<string, any> {
    const merged = { ...targetData };

    // Merge strategy: take newer values for each field
    for (const [key, sourceValue] of Object.entries(sourceData)) {
      if (key === 'id') continue; // Never merge IDs
      
      const targetValue = targetData[key];
      
      // If target doesn't have the field, use source
      if (targetValue === undefined || targetValue === null) {
        merged[key] = sourceValue;
        continue;
      }

      // For timestamps, use the newer one
      if (this.isTimestamp(key)) {
        merged[key] = new Date(sourceValue) > new Date(targetValue) ? sourceValue : targetValue;
        continue;
      }

      // For arrays, merge and deduplicate
      if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
        merged[key] = [...new Set([...targetValue, ...sourceValue])];
        continue;
      }

      // For objects, recursively merge
      if (typeof sourceValue === 'object' && typeof targetValue === 'object') {
        merged[key] = this.mergeData(sourceValue, targetValue, conflict);
        continue;
      }

      // Default: use source if it's newer
      merged[key] = conflict.sourceTimestamp > conflict.targetTimestamp ? sourceValue : targetValue;
    }

    return merged;
  }

  private isTimestamp(key: string): boolean {
    const timestampFields = ['createdAt', 'updatedAt', 'modifiedAt', 'lastModified', 'timestamp'];
    return timestampFields.some(field => key.toLowerCase().includes(field.toLowerCase()));
  }

  async getConflictStats(): Promise<{
    total: number;
    pending: number;
    resolved: number;
    manualReview: number;
  }> {
    const [total, pending, resolved, manualReview] = await Promise.all([
      this.conflictRepository.count(),
      this.conflictRepository.count({ where: { status: ConflictStatus.PENDING } }),
      this.conflictRepository.count({ where: { status: ConflictStatus.RESOLVED } }),
      this.conflictRepository.count({ where: { status: ConflictStatus.MANUAL_REVIEW } }),
    ]);

    return { total, pending, resolved, manualReview };
  }
}