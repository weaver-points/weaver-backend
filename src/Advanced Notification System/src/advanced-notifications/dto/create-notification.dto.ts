import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsUUID,
  IsNumber,
} from "class-validator";
import {
  NotificationPriority,
  NotificationCategory,
} from "../entities/notification-preference.entity";

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  userIds?: string[];

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsNumber()
  expiresAt?: Date;
}
