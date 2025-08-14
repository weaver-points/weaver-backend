import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type EventDocument = HydratedDocument<EventEntity>;

export enum EventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum EventStatus {
  NEW = 'new',
  PROCESSED = 'processed',
  FAILED = 'failed',
  PUBLISH_FAILED = 'publish_failed',
}

@Schema({
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'events',
})
export class EventEntity {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  type!: string; // references EventTypeEntity.key

  @Prop({ required: false })
  source?: string; // service/component name

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ required: false })
  userId?: string; // optional related user

  @Prop({ required: false })
  correlationId?: string; // to link related events

  @Prop({ enum: EventSeverity, default: EventSeverity.LOW })
  severity!: EventSeverity;

  @Prop({ enum: EventStatus, default: EventStatus.NEW })
  status!: EventStatus;

  @Prop({
    type: [
      {
        channel: String,
        error: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  publishErrors?: Array<{
    channel: string;
    error: string;
    timestamp: Date;
  }>;

  @Prop({ type: Date, default: () => new Date() })
  occurredAt!: Date;

  @Prop({ index: true })
  stream?: string; // logical stream name for partitioning

  createdAt!: Date;
  updatedAt!: Date;
}

export const EventSchema = SchemaFactory.createForClass(EventEntity);

EventSchema.index({ type: 1, occurredAt: -1 });
EventSchema.index({ userId: 1, occurredAt: -1 });
EventSchema.index({ correlationId: 1 });
EventSchema.index({ stream: 1, occurredAt: -1 });
