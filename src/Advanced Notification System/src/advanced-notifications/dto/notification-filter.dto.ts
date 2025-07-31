import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsDateString,
} from "class-validator";
import {
  NotificationCategory,
  NotificationPriority,
} from "../entities/notification-preference.entity";

export class NotificationFilterDto {
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}
