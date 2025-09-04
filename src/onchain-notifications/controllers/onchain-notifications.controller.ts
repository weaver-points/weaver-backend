import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OnchainNotificationsService } from '../services/onchain-notifications.service';
import { CreateOnchainNotificationDto } from '../dto/create-onchain-notification.dto';
import {
  NotificationStatus,
  NotificationType,
} from '../enums/notification.enums';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';

@ApiTags('Onchain Notifications')
@Controller('onchain-notifications')
@UseGuards(JwtAuthGuard)
export class OnchainNotificationsController {
  constructor(
    private readonly onchainNotificationsService: OnchainNotificationsService,
  ) {}

  @Post()
  @Roles('admin', 'protocol')
  @ApiOperation({ summary: 'Send an onchain notification' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid notification data' })
  async sendNotification(createNotificationDto: CreateOnchainNotificationDto) {
    return this.onchainNotificationsService.sendNotification(
      createNotificationDto,
    );
  }

  @Post('batch')
  @Roles('admin', 'protocol')
  @ApiOperation({ summary: 'Send multiple onchain notifications' })
  @ApiResponse({ status: 201, description: 'Batch notifications processed' })
  async batchSendNotifications(notifications: CreateOnchainNotificationDto[]) {
    return this.onchainNotificationsService.batchSendNotifications(
      notifications,
    );
  }

  @Get(':id/status')
  @Roles('admin', 'protocol', 'user')
  @ApiOperation({ summary: 'Get notification status' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async getNotificationStatus(@Param('id') id: string) {
    return this.onchainNotificationsService.getNotificationStatus(id);
  }

  @Get('user/:address')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiParam({ name: 'address', description: 'User Starknet address' })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getUserNotifications(
    @Param('address') address: string,
    @Query('status') status?: NotificationStatus,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.onchainNotificationsService.getUserNotifications(address, {
      status,
      type,
      limit,
      offset,
    });
  }

  @Patch('preferences/:address')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiParam({ name: 'address', description: 'User Starknet address' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateNotificationPreferences(
    @Param('address') address: string,
    preferences: UpdateNotificationPreferencesDto,
  ) {
    await this.onchainNotificationsService.updateNotificationPreferences(
      address,
      preferences,
    );
  }

  @Get('preferences/:address')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiParam({ name: 'address', description: 'User Starknet address' })
  async getUserPreferences(@Param('address') address: string) {
    return this.onchainNotificationsService.getUserPreferences(address);
  }

  @Get('history/:address')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get user notification history' })
  @ApiParam({ name: 'address', description: 'User Starknet address' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getNotificationHistory(
    @Param('address') address: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.onchainNotificationsService.getNotificationHistory(address, {
      startDate,
      endDate,
      limit,
      offset,
    });
  }

  @Post(':id/retry')
  @Roles('admin', 'protocol')
  @ApiOperation({ summary: 'Retry failed notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async retryFailedNotification(@Param('id') id: string) {
    await this.onchainNotificationsService.retryFailedNotification(id);
  }

  @Delete(':id')
  @Roles('admin', 'protocol')
  @ApiOperation({ summary: 'Cancel pending notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelNotification(@Param('id') id: string) {
    await this.onchainNotificationsService.cancelNotification(id);
  }
}
function Roles(arg0: string, arg1: string) {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    throw new Error('Function not implemented.');
  };
}
