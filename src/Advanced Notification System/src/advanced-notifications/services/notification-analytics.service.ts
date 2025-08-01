import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  NotificationAnalytics,
  EngagementAction,
} from "../entities/notification-analytics.entity";
import {
  NotificationCategory,
  NotificationChannel,
} from "../entities/notification-preference.entity";

export interface AnalyticsReport {
  totalNotifications: number;
  deliveryRate: number;
  engagementRate: number;
  channelPerformance: Record<string, any>;
  categoryPerformance: Record<string, any>;
  userEngagement: Record<string, any>;
}

@Injectable()
export class NotificationAnalyticsService {
  constructor(
    @InjectRepository(NotificationAnalytics)
    private analyticsRepository: Repository<NotificationAnalytics>
  ) {}

  async trackEngagement(
    notificationId: string,
    userId: string,
    category: NotificationCategory,
    channel: NotificationChannel,
    action: EngagementAction,
    metadata?: Record<string, any>
  ): Promise<void> {
    const analytics = this.analyticsRepository.create({
      notificationId,
      userId,
      category,
      channel,
      action,
      metadata,
    });

    await this.analyticsRepository.save(analytics);
  }

  async generateReport(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<AnalyticsReport> {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder("analytics")
      .where("analytics.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });

    if (userId) {
      queryBuilder.andWhere("analytics.userId = :userId", { userId });
    }

    const analytics = await queryBuilder.getMany();

    return {
      totalNotifications: analytics.length,
      deliveryRate: this.calculateDeliveryRate(analytics),
      engagementRate: this.calculateEngagementRate(analytics),
      channelPerformance: this.analyzeChannelPerformance(analytics),
      categoryPerformance: this.analyzeCategoryPerformance(analytics),
      userEngagement: this.analyzeUserEngagement(analytics),
    };
  }

  private calculateDeliveryRate(analytics: NotificationAnalytics[]): number {
    const delivered = analytics.filter(
      (a) => a.action !== EngagementAction.DISMISSED
    ).length;
    return analytics.length > 0 ? (delivered / analytics.length) * 100 : 0;
  }

  private calculateEngagementRate(analytics: NotificationAnalytics[]): number {
    const engaged = analytics.filter((a) =>
      [
        EngagementAction.OPENED,
        EngagementAction.CLICKED,
        EngagementAction.CONVERTED,
      ].includes(a.action)
    ).length;
    return analytics.length > 0 ? (engaged / analytics.length) * 100 : 0;
  }

  private analyzeChannelPerformance(
    analytics: NotificationAnalytics[]
  ): Record<string, any> {
    const channelStats = {};

    for (const channel of Object.values(NotificationChannel)) {
      const channelAnalytics = analytics.filter((a) => a.channel === channel);
      channelStats[channel] = {
        total: channelAnalytics.length,
        engagement: this.calculateEngagementRate(channelAnalytics),
      };
    }

    return channelStats;
  }

  private analyzeCategoryPerformance(
    analytics: NotificationAnalytics[]
  ): Record<string, any> {
    const categoryStats = {};

    for (const category of Object.values(NotificationCategory)) {
      const categoryAnalytics = analytics.filter(
        (a) => a.category === category
      );
      categoryStats[category] = {
        total: categoryAnalytics.length,
        engagement: this.calculateEngagementRate(categoryAnalytics),
      };
    }

    return categoryStats;
  }

  private analyzeUserEngagement(
    analytics: NotificationAnalytics[]
  ): Record<string, any> {
    const userStats = {};
    const userGroups = analytics.reduce((acc, a) => {
      if (!acc[a.userId]) acc[a.userId] = [];
      acc[a.userId].push(a);
      return acc;
    }, {});

    for (const [userId, userAnalytics] of Object.entries(userGroups)) {
      userStats[userId] = {
        total: (userAnalytics as NotificationAnalytics[]).length,
        engagement: this.calculateEngagementRate(
          userAnalytics as NotificationAnalytics[]
        ),
      };
    }

    return userStats;
  }
}
