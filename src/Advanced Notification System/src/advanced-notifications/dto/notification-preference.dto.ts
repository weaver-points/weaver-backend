import {
  IsEnum,
  IsArray,
  IsOptional,
  IsObject,
  IsBoolean,
  IsUUID,
} from "class-validator";
import {
  NotificationPriority,
  NotificationChannel,
  NotificationCategory,
} from "../entities/notification-preference.entity";

export class UpdateNotificationPreferenceDto {
  @IsUUID()
  userId: string;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  enabledChannels: NotificationChannel[];

  @IsEnum(NotificationPriority)
  minimumPriority: NotificationPriority;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsObject()
  scheduleSettings?: {
    quietHours?: { start: string; end: string };
    timezone?: string;
    workdaysOnly?: boolean;
  };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
