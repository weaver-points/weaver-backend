import { Injectable, Logger } from "@nestjs/common";
import {
  NotificationDelivery,
  DeliveryStatus,
} from "../entities/notification-channel.entity";

export interface SmsNotification {
  phoneNumber: string;
  message: string;
}

@Injectable()
export class SmsChannelService {
  private readonly logger = new Logger(SmsChannelService.name);

  async sendSms(
    notification: SmsNotification,
    delivery: NotificationDelivery
  ): Promise<void> {
    try {
      this.logger.log(`Sending SMS to ${notification.phoneNumber}`);

      // Example integration with Twilio
      // const message = await this.twilioClient.messages.create({
      //   body: notification.message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: notification.phoneNumber,
      // });

      delivery.status = DeliveryStatus.SENT;
      delivery.sentAt = new Date();
      delivery.externalId = `sms_${Date.now()}`;

      // Simulate delivery status check
      setTimeout(() => {
        delivery.status = DeliveryStatus.DELIVERED;
        delivery.deliveredAt = new Date();
      }, 2000);
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      delivery.status = DeliveryStatus.FAILED;
      delivery.errorMessage = error.message;
    }
  }
}
