import { Injectable, Logger, HttpService } from "@nestjs/common";
import {
  NotificationDelivery,
  DeliveryStatus,
} from "../entities/notification-channel.entity";

export interface DiscordNotification {
  webhookUrl: string;
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
  }>;
}

@Injectable()
export class DiscordChannelService {
  private readonly logger = new Logger(DiscordChannelService.name);

  constructor(private readonly httpService: HttpService) {}

  async sendDiscordMessage(
    notification: DiscordNotification,
    delivery: NotificationDelivery
  ): Promise<void> {
    try {
      this.logger.log(`Sending Discord message via webhook`);

      const response = await this.httpService
        .post(notification.webhookUrl, {
          content: notification.content,
          embeds: notification.embeds,
        })
        .toPromise();

      delivery.status = DeliveryStatus.SENT;
      delivery.sentAt = new Date();
      delivery.externalId = `discord_${Date.now()}`;
      delivery.status = DeliveryStatus.DELIVERED;
      delivery.deliveredAt = new Date();
    } catch (error) {
      this.logger.error(`Failed to send Discord message: ${error.message}`);
      delivery.status = DeliveryStatus.FAILED;
      delivery.errorMessage = error.message;
    }
  }
}
