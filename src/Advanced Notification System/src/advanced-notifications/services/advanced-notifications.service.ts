import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  NotificationPreference,
  NotificationChannel,
} from "../entities/notification-preference.entity";
import { NotificationTemplate } from "../entities/notification-template.entity";
import { CreateNotificationDto } from "../dto/create-notification.dto";
import {
  NotificationFilterService,
  NotificationContext,
} from "./notification-filter.service";
import { ChannelDeliveryService } from "./channel-delivery.service";
import { NotificationAnalyticsService } from "./notification-analytics.service";

@Injectable()
export class AdvancedNotificationsService {
  private readonly logger = new Logger(AdvancedNotificationsService.name);
  private readonly notificationQueue: Map<string, any[]> = new Map();

  constructor(
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
    private filterService: NotificationFilterService,
    private deliveryService: ChannelDeliveryService,
    private analyticsService: NotificationAnalyticsService
  ) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto
  ): Promise<string> {
    const notificationId = `notif_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    let targetUsers: string[] = [];

    if (
      createNotificationDto.userIds &&
      createNotificationDto.userIds.length > 0
    ) {
      targetUsers = createNotificationDto.userIds;
    } else {
      // Get all users with preferences for this category
      const preferences = await this.preferenceRepository.find({
        where: {
          category: createNotificationDto.category,
          isActive: true,
        },
      });
      targetUsers = preferences.map((p) => p.userId);
    }

    // Process each user
    for (const userId of targetUsers) {
      await this.processNotificationForUser(
        notificationId,
        userId,
        createNotificationDto
      );
    }

    this.logger.log(
      `Created notification ${notificationId} for ${targetUsers.length} users`
    );
    return notificationId;
  }

  private async processNotificationForUser(
    notificationId: string,
    userId: string,
    notification: CreateNotificationDto
  ): Promise<void> {
    const preferences = await this.preferenceRepository.find({
      where: {
        userId,
        category: notification.category,
        isActive: true,
      },
    });

    if (preferences.length === 0) {
      this.logger.debug(
        `No preferences found for user ${userId} and category ${notification.category}`
      );
      return;
    }

    const context: NotificationContext = {
      userId,
      category: notification.category,
      priority: notification.priority,
      data: notification.data || {},
      marketConditions: await this.getMarketConditions(),
      portfolioData: await this.getPortfolioData(userId),
    };

    for (const preference of preferences) {
      if (this.filterService.shouldSendNotification(preference, context)) {
        await this.sendNotificationThroughChannels(
          notificationId,
          userId,
          preference.enabledChannels,
          notification,
          context
        );
      }
    }
  }

  private async sendNotificationThroughChannels(
    notificationId: string,
    userId: string,
    channels: NotificationChannel[],
    notification: CreateNotificationDto,
    context: NotificationContext
  ): Promise<void> {
    for (const channel of channels) {
      try {
        const content = await this.prepareNotificationContent(
          channel,
          notification,
          context
        );

        await this.deliveryService.deliverNotification(
          notificationId,
          userId,
          channel,
          content
        );

        this.logger.debug(`Queued ${channel} notification for user ${userId}`);
      } catch (error) {
        this.logger.error(
          `Failed to queue ${channel} notification for user ${userId}: ${error.message}`
        );
      }
    }
  }

  private async prepareNotificationContent(
    channel: NotificationChannel,
    notification: CreateNotificationDto,
    context: NotificationContext
  ): Promise<any> {
    const template = await this.getTemplate(channel, notification.category);

    if (!template) {
      // Fallback to default content
      return this.createDefaultContent(channel, notification, context);
    }

    return this.renderTemplate(template, notification, context);
  }

  private async getTemplate(
    channel: NotificationChannel,
    category: any
  ): Promise<NotificationTemplate | null> {
    return await this.templateRepository.findOne({
      where: {
        channel,
        category,
        isActive: true,
      },
    });
  }

  private createDefaultContent(
    channel: NotificationChannel,
    notification: CreateNotificationDto,
    context: NotificationContext
  ): any {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return {
          to: context.userId, // Should be email address
          subject: notification.title,
          html: `<h1>${notification.title}</h1><p>${notification.message}</p>`,
          text: `${notification.title}\n\n${notification.message}`,
        };

      case NotificationChannel.PUSH:
        return {
          userId: context.userId,
          title: notification.title,
          body: notification.message,
          data: notification.data,
        };

      case NotificationChannel.DISCORD:
        return {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL,
          embeds: [
            {
              title: notification.title,
              description: notification.message,
              color: this.getPriorityColor(notification.priority),
              timestamp: new Date().toISOString(),
            },
          ],
        };

      case NotificationChannel.SMS:
        return {
          phoneNumber: context.userId, // Should be phone number
          message: `${notification.title}: ${notification.message}`,
        };

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  private renderTemplate(
    template: NotificationTemplate,
    notification: CreateNotificationDto,
    context: NotificationContext
  ): any {
    let renderedTemplate = template.template;
    let renderedSubject = template.subject;

    // Replace variables in template
    const variables = {
      title: notification.title,
      message: notification.message,
      userId: context.userId,
      priority: notification.priority,
      category: notification.category,
      ...notification.data,
      ...context.portfolioData,
      ...context.marketConditions,
    };

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      renderedTemplate = renderedTemplate.replace(
        new RegExp(placeholder, "g"),
        String(value || "")
      );
      renderedSubject = renderedSubject.replace(
        new RegExp(placeholder, "g"),
        String(value || "")
      );
    }

    switch (template.channel) {
      case NotificationChannel.EMAIL:
        return {
          to: context.userId,
          subject: renderedSubject,
          html: renderedTemplate,
        };

      case NotificationChannel.PUSH:
        return {
          userId: context.userId,
          title: renderedSubject,
          body: renderedTemplate,
          data: notification.data,
        };

      case NotificationChannel.DISCORD:
        return {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL,
          embeds: JSON.parse(renderedTemplate),
        };

      case NotificationChannel.SMS:
        return {
          phoneNumber: context.userId,
          message: renderedTemplate,
        };
    }
  }

  private getPriorityColor(priority: any): number {
    const colors = {
      low: 0x00ff00,
      medium: 0xffff00,
      high: 0xff9900,
      critical: 0xff0000,
    };
    return colors[priority] || 0x000000;
  }

  private async getMarketConditions(): Promise<Record<string, any>> {
    // Mock market data - integrate with your market data service
    return {
      volatility: Math.random(),
      trend: Math.random() > 0.5 ? "up" : "down",
      volume: Math.random() * 1000000,
    };
  }

  private async getPortfolioData(userId: string): Promise<Record<string, any>> {
    // Mock portfolio data - integrate with your portfolio service
    return {
      totalValue: Math.random() * 100000,
      changePercent: (Math.random() - 0.5) * 20,
      positions: Math.floor(Math.random() * 10) + 1,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processNotificationQueue(): Promise<void> {
    // Process queued notifications for batch delivery
    this.logger.debug("Processing notification queue...");

    for (const [userId, notifications] of this.notificationQueue.entries()) {
      if (notifications.length > 0) {
        // Batch process notifications for this user
        await this.processBatchNotifications(userId, notifications);
        this.notificationQueue.set(userId, []);
      }
    }
  }

  private async processBatchNotifications(
    userId: string,
    notifications: any[]
  ): Promise<void> {
    // Implement batching logic - combine similar notifications, apply rate limiting, etc.
    this.logger.debug(
      `Processing ${notifications.length} batched notifications for user ${userId}`
    );
  }

  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return await this.preferenceRepository.find({
      where: { userId },
    });
  }

  async updateUserPreference(
    userId: string,
    category: any,
    preference: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    let existingPreference = await this.preferenceRepository.findOne({
      where: { userId, category },
    });

    if (!existingPreference) {
      existingPreference = this.preferenceRepository.create({
        userId,
        category,
        ...preference,
      });
    } else {
      Object.assign(existingPreference, preference);
    }

    return await this.preferenceRepository.save(existingPreference);
  }

  async createTemplate(
    templateData: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    const template = this.preferenceRepository.create(templateData);
    return await this.templateRepository.save(template);
  }

  async getTemplates(
    channel?: NotificationChannel,
    category?: any
  ): Promise<NotificationTemplate[]> {
    const where: any = { isActive: true };
    if (channel) where.channel = channel;
    if (category) where.category = category;

    return await this.templateRepository.find({ where });
  }
}
