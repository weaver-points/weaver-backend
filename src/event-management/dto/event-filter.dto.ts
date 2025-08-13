import {
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EventSeverity, EventStatus } from '../entities/event.entity';

export class EventFilterDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20, { message: 'Maximum 20 event types allowed' })
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return (value || []) as string[];
  })
  types?: string[];

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'User ID must contain only alphanumeric characters, dots, hyphens, and underscores',
  })
  userId?: string;

  @IsOptional()
  @IsEnum(EventSeverity)
  severity?: EventSeverity;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

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
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Stream name must contain only alphanumeric characters, dots, hyphens, and underscores',
  })
  stream?: string;
}
