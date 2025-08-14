import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEntity, EventStatus } from '../entities/event.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventArchivalService {
  private readonly logger = new Logger(EventArchivalService.name);
  private readonly retentionDays: number;
  private readonly batchSize = 1000;

  constructor(
    @InjectModel(EventEntity.name)
    private readonly eventModel: Model<EventEntity>,
    private readonly configService: ConfigService,
  ) {
    this.retentionDays =
      this.configService.get<number>('EVENT_RETENTION_DAYS') || 90;
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduleCleanup() {
    this.logger.log('Starting scheduled event cleanup');
    try {
      const { archivedCount, deletedCount } = await this.cleanupOldEvents();
      this.logger.log(
        `Cleanup completed: ${archivedCount} archived, ${deletedCount} deleted`,
      );
    } catch (error) {
      this.logger.error(`Cleanup failed: ${String(error)}`);
    }
  }

  async cleanupOldEvents(): Promise<{
    archivedCount: number;
    deletedCount: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    let archivedCount = 0;
    let deletedCount = 0;

    // Archive processed events older than retention period
    const archiveCursor = this.eventModel
      .find({
        status: EventStatus.PROCESSED,
        createdAt: { $lt: cutoffDate },
      })
      .cursor({ batchSize: this.batchSize });

    try {
      for await (const event of archiveCursor) {
        try {
          const deleteDate = new Date(cutoffDate);
          deleteDate.setDate(deleteDate.getDate() - 30);

          if (event.createdAt < deleteDate) {
            await this.eventModel.findByIdAndDelete(event._id);
            deletedCount++;
          } else {
            await this.eventModel.findByIdAndUpdate(event._id, {
              'metadata.archived': true,
              'metadata.archivedAt': new Date(),
            });
            archivedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to archive event ${String(event._id)}: ${String(error)}`,
          );
        }
      }
    } finally {
      await archiveCursor.close();
    }
    const failedDeleteResult = await this.eventModel.deleteMany({
      status: EventStatus.FAILED,
      createdAt: { $lt: cutoffDate },
    });

    deletedCount += failedDeleteResult.deletedCount || 0;

    return { archivedCount, deletedCount };
  }

  async getStorageStats(): Promise<{
    totalEvents: number;
    eventsByStatus: Record<string, number>;
    oldestEvent: Date | null;
    newestEvent: Date | null;
    estimatedSizeMB: number;
  }> {
    const [totalEvents, statusCounts, oldestEvent, newestEvent, sampleEvents] =
      await Promise.all([
        this.eventModel.countDocuments(),
        this.eventModel.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        this.eventModel.findOne({}, {}, { sort: { createdAt: 1 } }).lean(),
        this.eventModel.findOne({}, {}, { sort: { createdAt: -1 } }).lean(),
        this.eventModel.find({}).limit(100).lean(), // Sample for size estimation
      ]);

    const eventsByStatus: Record<string, number> = {};
    statusCounts.forEach((item: { _id: string; count: number }) => {
      eventsByStatus[item._id] = item.count;
    });

    // Rough size estimation based on sample
    const avgEventSize =
      sampleEvents.length > 0
        ? sampleEvents.reduce(
            (acc, event) => acc + JSON.stringify(event).length,
            0,
          ) / sampleEvents.length
        : 1024; // Default 1KB per event

    const estimatedSizeMB = (totalEvents * avgEventSize) / (1024 * 1024);

    return {
      totalEvents,
      eventsByStatus,
      oldestEvent: oldestEvent?.createdAt || null,
      newestEvent: newestEvent?.createdAt || null,
      estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
    };
  }
}
