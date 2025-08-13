import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEntity, EventSchema } from './entities/event.entity';
import { EventTypeEntity, EventTypeSchema } from './entities/event-type.entity';
import {
  EventSubscriptionEntity,
  EventSubscriptionSchema,
} from './entities/event-subscription.entity';
import { EventManagementService } from './services/event-management.service';
import { EventPublisherService } from './services/event-publisher.service';
import { EventSubscriberService } from './services/event-subscriber.service';
import { EventArchivalService } from './services/event-archival.service';
import { EventManagementController } from './controllers/event-management.controller';
import { EventProcessor } from './processors/event-processor';
import { createClientProvider } from './redis.provider';

import { RateLimitGuard } from './guards/rate-limit.guard';
import { EventWebsocketGateway } from './websocket.gateway';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: EventEntity.name, schema: EventSchema },
      { name: EventTypeEntity.name, schema: EventTypeSchema },
      { name: EventSubscriptionEntity.name, schema: EventSubscriptionSchema },
    ]),
  ],
  controllers: [EventManagementController],
  providers: [
    createClientProvider('EVENTS_REDIS'),
    { provide: 'Redis', useExisting: 'EVENTS_REDIS' },
    EventManagementService,
    EventPublisherService,
    EventSubscriberService,
    EventArchivalService,
    EventProcessor,
    EventWebsocketGateway,
    RateLimitGuard,
  ],
  exports: [
    EventManagementService,
    EventPublisherService,
    EventArchivalService,
  ],
})
export class EventManagementModule {}
