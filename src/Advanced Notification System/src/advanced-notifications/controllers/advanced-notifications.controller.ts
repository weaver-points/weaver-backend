import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AdvancedNotificationsService } from "../services/advanced-notifications.service";
import { NotificationAnalyticsService } from "../services/notification-analytics.service";
import { ChannelDeliveryService } from "../services/channel-delivery.service";
import { CreateNotificationDto } from "../dto/create-notification.dto";
import { UpdateNotificationPreferenceDto } from "../dto/notification-preference.dto";
import { NotificationFilterDto } from "../dto/notification-filter.dto";
import {
  NotificationChannel,
  NotificationCategory,
} from "../entities/notification-preference.entity";
import { EngagementAction } from "../entities/notification-analytics.entity";

@ApiTags("Advanced Notifications")
@ApiBearerAuth()
@Controller("advanced-notifications")
export class AdvancedNotificationsController {
  constructor(
    private readonly notificationsService: AdvancedNotificationsService,
    private readonly analyticsService: NotificationAnalyticsService,
    private readonly deliveryService: ChannelDeliveryService
  ) {}

  @Post()
  @ApiOperation({ summary: "Create and send a new notification" })
  @ApiResponse({
    status: 201,
    description: "Notification created successfully",
  })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto
  ) {
    const notificationId = await this.notificationsService.createNotification(
      createNotificationDto
    );
    return {
      success: true,
      notificationId,
      message: "Notification created and queued for delivery",
    };
  }

  @Get("preferences/:userId")
  @ApiOperation({ summary: "Get user notification preferences" })
  @ApiResponse({
    status: 200,
    description: "User preferences retrieved successfully",
  })
  async getUserPreferences(@Param("userId") userId: string) {
    const preferences = await this.notificationsService.getUserPreferences(
      userId
    );
    return {
      success: true,
      data: preferences,
    };
  }

  @Put("preferences")
  @ApiOperation({ summary: "Update user notification preferences" })
  @ApiResponse({ status: 200, description: "Preferences updated successfully" })
  async updateUserPreferences(
    @Body() updatePreferenceDto: UpdateNotificationPreferenceDto
  ) {
    const preference = await this.notificationsService.updateUserPreference(
      updatePreferenceDto.userId,
      updatePreferenceDto.category,
      updatePreferenceDto
    );
    return {
      success: true,
      data: preference,
    };
  }

  @Get("templates")
  @ApiOperation({ summary: "Get notification templates" })
  @ApiResponse({ status: 200, description: "Templates retrieved successfully" })
  async getTemplates(
    @Query("channel") channel?: NotificationChannel,
    @Query("category") category?: NotificationCategory
  ) {
    const templates = await this.notificationsService.getTemplates(
      channel,
      category
    );
    return {
      success: true,
      data: templates,
    };
  }

  @Post("templates")
  @ApiOperation({ summary: "Create a new notification template" })
  @ApiResponse({ status: 201, description: "Template created successfully" })
  async createTemplate(@Body() templateData: any) {
    const template = await this.notificationsService.createTemplate(
      templateData
    );
    return {
      success: true,
      data: template,
    };
  }

  @Get("delivery/:deliveryId")
  @ApiOperation({ summary: "Get delivery status" })
  @ApiResponse({
    status: 200,
    description: "Delivery status retrieved successfully",
  })
  async getDeliveryStatus(@Param("deliveryId") deliveryId: string) {
    const delivery = await this.deliveryService.getDeliveryStatus(deliveryId);
    return {
      success: true,
      data: delivery,
    };
  }

  @Post("delivery/:deliveryId/retry")
  @ApiOperation({ summary: "Retry failed delivery" })
  @ApiResponse({ status: 200, description: "Delivery retry initiated" })
  @HttpCode(HttpStatus.OK)
  async retryDelivery(@Param("deliveryId") deliveryId: string) {
    await this.deliveryService.retryFailedDelivery(deliveryId);
    return {
      success: true,
      message: "Delivery retry initiated",
    };
  }

  @Post("analytics/track")
  @ApiOperation({ summary: "Track notification engagement" })
  @ApiResponse({ status: 200, description: "Engagement tracked successfully" })
  @HttpCode(HttpStatus.OK)
  async trackEngagement(
    @Body()
    trackingData: {
      notificationId: string;
      userId: string;
      category: NotificationCategory;
      channel: NotificationChannel;
      action: EngagementAction;
      metadata?: Record<string, any>;
    }
  ) {
    await this.analyticsService.trackEngagement(
      trackingData.notificationId,
      trackingData.userId,
      trackingData.category,
      trackingData.channel,
      trackingData.action,
      trackingData.metadata
    );
    return {
      success: true,
      message: "Engagement tracked successfully",
    };
  }

  @Get("analytics/report")
  @ApiOperation({ summary: "Generate analytics report" })
  @ApiResponse({
    status: 200,
    description: "Analytics report generated successfully",
  })
  async getAnalyticsReport(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("userId") userId?: string
  ) {
    const report = await this.analyticsService.generateReport(
      new Date(startDate),
      new Date(endDate),
      userId
    );
    return {
      success: true,
      data: report,
    };
  }

  @Get("health")
  @ApiOperation({ summary: "Check notification system health" })
  @ApiResponse({ status: 200, description: "System health status" })
  async getSystemHealth() {
    // Implement health checks for all channels
    return {
      success: true,
      status: "healthy",
      channels: {
        email: "operational",
        push: "operational",
        discord: "operational",
        sms: "operational",
      },
      timestamp: new Date().toISOString(),
    };
  }
}
