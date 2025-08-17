import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEntity, EventStatus } from '../entities/event.entity';

@Injectable()
export class EventProcessor {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    @InjectModel(EventEntity.name)
    private readonly eventModel: Model<EventEntity>,
  ) {}

  async markProcessed(id: string) {
    try {
      const result = await this.eventModel.findByIdAndUpdate(id, {
        status: EventStatus.PROCESSED,
      });
      if (!result) {
        this.logger.warn(`Event not found while marking as processed: ${id}`);
        throw new Error(`Event not found: ${id}`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to mark event ${id} as processed: ${String(err)}`,
      );
      throw err;
    }
  }

  async markFailed(id: string, reason?: string) {
    try {
      const result = await this.eventModel.findByIdAndUpdate(id, {
        status: EventStatus.FAILED,
        'metadata.error': reason,
      });
      if (!result) {
        throw new Error(`Event not found: ${id}`);
      }
    } catch (err) {
      this.logger.error(`Failed to mark event ${id} as failed: ${String(err)}`);
      throw err;
    }
  }

  async reprocessFailed(limit = 100) {
    const failed = await this.eventModel
      .find({ status: EventStatus.FAILED })
      .limit(limit)
      .lean();
    for (const evt of failed) {
      try {
        // domain-specific reprocessing can be plugged here
        await this.eventModel.findByIdAndUpdate(evt._id, {
          status: EventStatus.NEW,
        });
      } catch (err) {
        this.logger.error(
          `Failed to reprocess ${String(evt._id)}: ${String(err)}`,
        );
      }
    }
  }
}
