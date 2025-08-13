import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { EventEntity } from '../entities/event.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { EventPublisherService } from './event-publisher.service';
import { EventFilterDto } from '../dto/event-filter.dto';
import { EventTypeEntity } from '../entities/event-type.entity';
import { EventSubscriptionEntity } from '../entities/event-subscription.entity';

@Injectable()
export class EventManagementService {
  constructor(
    @InjectModel(EventEntity.name)
    private readonly eventModel: Model<EventEntity>,
    @InjectModel(EventTypeEntity.name)
    private readonly eventTypeModel: Model<EventTypeEntity>,
    @InjectModel(EventSubscriptionEntity.name)
    private readonly subscriptionModel: Model<EventSubscriptionEntity>,
    private readonly publisher: EventPublisherService,
  ) {}

  create(dto: CreateEventDto) {
    return this.publisher.publish(dto);
  }

  async findAll(filter: EventFilterDto, page = 1, limit = 50) {
    // Validate date range
    if (filter.from && filter.to) {
      const fromDate = new Date(filter.from);
      const toDate = new Date(filter.to);
      if (fromDate >= toDate) {
        throw new Error('Invalid date range: from date must be before to date');
      }
      // Limit date range to prevent excessive queries
      const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
        throw new Error('Date range too large: maximum 1 year allowed');
      }
    }

    const q: Record<string, unknown> = {};
    if (filter.types) q.type = { $in: filter.types };
    if (filter.userId) q.userId = filter.userId;
    if (filter.severity) q.severity = filter.severity;
    if (filter.status) q.status = filter.status;
    if (filter.stream) q.stream = filter.stream;

    // Safely handle metadata filtering with depth limit
    if (filter.metadata) {
      const metadataEntries = Object.entries(filter.metadata);
      if (metadataEntries.length > 10) {
        throw new Error('Too many metadata filters: maximum 10 allowed');
      }

      for (const [k, v] of metadataEntries) {
        // Prevent NoSQL injection and limit key depth
        if (k.includes('$') || (k.includes('.') && k.split('.').length > 3)) {
          throw new Error(`Invalid metadata key: ${k}`);
        }
        q[`metadata.${k}`] = v;
      }
    }

    const dateRange: { $gte?: Date; $lte?: Date } = {};
    if (filter.from) dateRange.$gte = new Date(filter.from);
    if (filter.to) dateRange.$lte = new Date(filter.to);
    if (Object.keys(dateRange).length > 0) q.occurredAt = dateRange;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.eventModel
        .find(q as FilterQuery<EventEntity>)
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(30000), // 30 second timeout
      this.eventModel
        .countDocuments(q as FilterQuery<EventEntity>)
        .maxTimeMS(10000),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    return this.eventModel.findById(id).lean();
  }

  async update(id: string, dto: UpdateEventDto) {
    return this.eventModel.findByIdAndUpdate(id, dto, { new: true }).lean();
  }

  // Event Types
  async upsertEventType(
    type: Pick<
      EventTypeEntity,
      'key' | 'category' | 'jsonSchema' | 'description' | 'tags'
    >,
  ) {
    await this.eventTypeModel.updateOne(
      { key: type.key },
      { $set: type },
      { upsert: true },
    );
    return this.eventTypeModel.findOne({ key: type.key }).lean();
  }

  async listEventTypes() {
    return this.eventTypeModel.find().lean();
  }

  // Subscriptions
  async createSubscription(
    sub: Pick<
      EventSubscriptionEntity,
      | 'subscriberId'
      | 'eventTypes'
      | 'filter'
      | 'deliveryChannel'
      | 'webhookUrl'
      | 'enabled'
    >,
  ) {
    const doc = new this.subscriptionModel(sub as any);
    return doc.save();
  }

  async listSubscriptionsBySubscriber(subscriberId: string) {
    return this.subscriptionModel.find({ subscriberId }).lean();
  }

  // Metrics / Analytics
  async getMetrics(filter: EventFilterDto) {
    const match: Record<string, unknown> = {};
    if (filter.types) match.type = { $in: filter.types };
    if (filter.userId) match.userId = filter.userId;
    if (filter.severity) match.severity = filter.severity;
    if (filter.status) match.status = filter.status;
    if (filter.stream) match.stream = filter.stream;
    if (filter.from || filter.to) {
      const occurred: { $gte?: Date; $lte?: Date } = {};
      if (filter.from) occurred.$gte = new Date(filter.from);
      if (filter.to) occurred.$lte = new Date(filter.to);
      match.occurredAt = occurred;
    }

    type Summary = {
      total: number;
      byType: Array<{ _id: string; count: number }>;
      bySeverity: Array<{ _id: string; count: number }>;
      recent: Array<{
        _id: string;
        type: string;
        occurredAt: Date;
        severity: string;
      }>;
    };

    const [summary] = await this.eventModel.aggregate<Summary>([
      { $match: match },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
          ],
          bySeverity: [
            { $group: { _id: '$severity', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          recent: [
            { $sort: { occurredAt: -1 } },
            { $limit: 10 },
            { $project: { _id: 1, type: 1, occurredAt: 1, severity: 1 } },
          ],
        },
      },
      {
        $project: {
          total: { $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0] },
          byType: 1,
          bySeverity: 1,
          recent: 1,
        },
      },
    ]);
    return summary || { total: 0, byType: [], bySeverity: [], recent: [] };
  }
}
