import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventSubscriptionDocument =
  HydratedDocument<EventSubscriptionEntity>;

@Schema({ timestamps: true, collection: 'event_subscriptions' })
export class EventSubscriptionEntity {
  _id!: Types.ObjectId;

  @Prop({ required: true, index: true })
  subscriberId!: string; // userId, serviceId, or API key

  @Prop({ type: [String], index: true })
  eventTypes!: string[]; // list of EventTypeEntity.keys

  @Prop({ type: Object, default: {} })
  filter!: Record<string, unknown>; // Mongo-style filter for payload/metadata

  @Prop({ default: true })
  enabled!: boolean;

  @Prop({ required: false })
  deliveryChannel?: 'websocket' | 'redis' | 'http';

  @Prop({
    required: function (this: EventSubscriptionEntity) {
      return this.deliveryChannel === 'http';
    },
    validate: {
      validator: function (this: EventSubscriptionEntity, v: string) {
        if (this.deliveryChannel === 'http') {
          return /^https?:\/\/.+/.test(v);
        }
        return true;
      },
      message:
        'Webhook URL must be a valid http/https URL when delivery channel is http',
    },
  })
  webhookUrl?: string; // required when deliveryChannel === 'http'
}

export const EventSubscriptionSchema = SchemaFactory.createForClass(
  EventSubscriptionEntity,
);

EventSubscriptionSchema.index({ subscriberId: 1, enabled: 1 });
