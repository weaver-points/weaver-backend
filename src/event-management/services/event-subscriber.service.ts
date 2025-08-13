import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { EventEntity } from '../entities/event.entity';
import { EventSubscriptionEntity } from '../entities/event-subscription.entity';
import { Redis } from 'ioredis';

@Injectable()
export class EventSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventSubscriberService.name);
  private readonly subClient: Redis;

  constructor(
    @InjectModel(EventEntity.name)
    private readonly eventModel: Model<EventEntity>,
    @InjectModel(EventSubscriptionEntity.name)
    private readonly subscriptionModel: Model<EventSubscriptionEntity>,
    @Inject('Redis') private readonly redisClient: Redis,
  ) {
    // Duplicate connection for subscription (ioredis best practice)
    this.subClient = new Redis(redisClient.options);
  }

  async onModuleInit() {
    // Subscribe to wildcard-like aggregated channels by fetching all event types
    const subscriptions = await this.subscriptionModel
      .find({ enabled: true })
      .lean();
    const channels = new Set<string>();
    for (const sub of subscriptions) {
      for (const type of sub.eventTypes) channels.add(`events:${type}`);
    }
    if (channels.size > 0) {
      await this.subClient.subscribe(...Array.from(channels));
      this.logger.log(`Subscribed to ${channels.size} event channels`);
    }

    this.subClient.on('message', (channel: string, message: string) => {
      void (async () => {
        try {
          const event: unknown = JSON.parse(message) as unknown;
          await this.dispatchToMatchingSubscribers(event);
        } catch (err) {
          this.logger.error(`Failed to dispatch event: ${String(err)}`);
        }
      })();
    });
  }

  async onModuleDestroy() {
    await this.subClient.quit();
  }

  private async dispatchToMatchingSubscribers(event: unknown) {
    const { type, payload, metadata } = event as {
      type: string;
      payload: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };
    const cursor = this.subscriptionModel
      .find({ enabled: true, eventTypes: type })
      .cursor();
    for await (const sub of cursor) {
      if (!sub.filter || Object.keys(sub.filter).length === 0) {
        this.notifySubscriber(sub, event);
        continue;
      }
      // Mongo-like filter against payload/metadata fields
      const filter: FilterQuery<unknown> = sub.filter as FilterQuery<unknown>;
      const match = this.matchFilter({ payload, metadata }, filter);
      if (match) this.notifySubscriber(sub, event);
    }
  }

  private matchFilter(
    doc: Record<string, unknown>,
    filter: FilterQuery<unknown>,
  ): boolean {
    // Minimal matcher: equality for dotted paths only
    for (const [key, value] of Object.entries(filter)) {
      const actual = key
        .split('.')
        .reduce<unknown>(
          (acc, part) =>
            acc && typeof acc === 'object'
              ? (acc as Record<string, unknown>)[part]
              : undefined,
          doc,
        );
      if (actual !== value) return false;
    }
    return true;
  }

  // Placeholder: in this project we support websocket and redis fanout; HTTP webhooks can be implemented here later
  private notifySubscriber(sub: EventSubscriptionEntity, event: unknown) {
    if (sub.deliveryChannel === 'redis') {
      const channel = `subscribers:${sub.subscriberId}`;
      this.redisClient
        .publish(channel, JSON.stringify(event as Record<string, unknown>))
        .catch((e) =>
          this.logger.error(
            `Failed to publish to subscriber channel ${channel}: ${e}`,
          ),
        );
    }
    // websocket handled at gateway by listening to subscriber channel
  }
}
