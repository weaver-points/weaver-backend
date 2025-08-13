import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEventSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Subscriber ID must contain only alphanumeric characters, dots, hyphens, and underscores',
  })
  subscriberId!: string;

  @IsArray()
  @ArrayMaxSize(50, {
    message: 'Maximum 50 event types allowed per subscription',
  })
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return (value || []) as string[];
  })
  eventTypes!: string[];

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    }
    return (value || {}) as Record<string, unknown>;
  })
  filter?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(['websocket', 'redis', 'http'])
  deliveryChannel?: 'websocket' | 'redis' | 'http';

  @ValidateIf((o: CreateEventSubscriptionDto) => o.deliveryChannel === 'http')
  @IsUrl({}, { message: 'Invalid webhook URL format' })
  @Length(1, 500)
  webhookUrl?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return (value ?? true) as boolean;
  })
  enabled?: boolean;
}
