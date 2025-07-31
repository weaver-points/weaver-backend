import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { ScheduleModule } from "@nestjs/schedule";

// Entities
import { NotificationPreference } from "./entities/notification-preference.entity";
import { NotificationTemplate } from "./entities/notification-template.entity";
import { NotificationDelivery } from "./entities/notification-channel.entity";
import { NotificationAnalytics } from "./entities/notification-analytics.entity";

// Services
import { AdvancedNotificationsService } from "./services/advanced-notifications.service";
import { NotificationFilterService } from "./services/notification-filter.service";
import { ChannelDeliveryService } from "./services/channel-delivery.service";
import { NotificationAnalyticsService } from "./services/notification-analytics.service";

// Channels
import { EmailChannelService } from "./channels/email-channel";
import { PushChannelService } from "./channels/push-channel";
import { DiscordChannelService } from "./channels/discord-channel";
import { SmsChannelService } from "./channels/sms-channel";

// Controllers
import { AdvancedNotificationsController } from "./controllers/advanced-notifications.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationPreference,
      NotificationTemplate,
      NotificationDelivery,
      NotificationAnalytics,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AdvancedNotificationsController],
  providers: [
    AdvancedNotificationsService,
    NotificationFilterService,
    ChannelDeliveryService,
    NotificationAnalyticsService,
    EmailChannelService,
    PushChannelService,
    DiscordChannelService,
    SmsChannelService,
  ],
  exports: [
    AdvancedNotificationsService,
    NotificationAnalyticsService,
    ChannelDeliveryService,
  ],
})
export class AdvancedNotificationsModule {}
