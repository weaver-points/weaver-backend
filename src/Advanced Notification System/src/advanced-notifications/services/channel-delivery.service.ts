import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  NotificationDelivery,
  DeliveryStatus,
} from "../entities/notification-channel.entity";
import { NotificationChannel } from "../entities/notification-preference.entity";
import { EmailChannelService } from "../channels/email-channel";
import { PushChannelService } from "../channels/push-channel";
import { DiscordChannelService } from "../channels/discord-channel";
import { SmsChannelService } from "../channels/sms-channel";

@Injectable()
export class ChannelDeliveryService {
  private readonly logger = new Logger(ChannelDeliveryService.name);

  constructor(
    @InjectRepository(NotificationDelivery)
    private deliveryRepository: Repository<NotificationDelivery>,
    private emailChannel: EmailChannelService,
    private pushChannel: PushChannelService,
    private discordChannel: DiscordChannelService,
    private smsChannel: SmsChannelService
  ) {}

  async deliverNotification(
    notificationId: string,
    userId: string,
    channel: NotificationChannel,
    content: any
  ): Promise<NotificationDelivery> {
    const delivery = this.deliveryRepository.create({
      notificationId,
      userId,
      channel,
      status: DeliveryStatus.PENDING,
    });

    await this.deliveryRepository.save(delivery);

    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.emailChannel.sendEmail(content, delivery);
          break;
        case NotificationChannel.PUSH:
          await this.pushChannel.sendPushNotification(content, delivery);
          break;
        case NotificationChannel.DISCORD:
          await this.discordChannel.sendDiscordMessage(content, delivery);
          break;
        case NotificationChannel.SMS:
          await this.smsChannel.sendSms(content, delivery);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (error) {
      delivery.status = DeliveryStatus.FAILED;
      delivery.errorMessage = error.message;
    }

    return await this.deliveryRepository.save(delivery);
  }

  async getDeliveryStatus(deliveryId: string): Promise<NotificationDelivery> {
    return await this.deliveryRepository.findOne({
      where: { id: deliveryId },
    });
  }

  async retryFailedDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId, status: DeliveryStatus.FAILED },
    });

    if (!delivery) {
      throw new Error("Delivery not found or not in failed state");
    }

    // Reset status and retry
    delivery.status = DeliveryStatus.PENDING;
    delivery.errorMessage = null;
    await this.deliveryRepository.save(delivery);

    // Re-attempt delivery logic here
  }
}
