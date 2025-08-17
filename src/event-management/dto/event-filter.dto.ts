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
    if (value == null) {
      return undefined;
    }
    let tokens: string[];
    if (typeof value === 'string') {
      tokens = value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (Array.isArray(value)) {
      tokens = value
        .map(String)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else {
      return undefined;
    }
    const seen = new Set();
    const deduped = tokens.filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
    return deduped.length > 0 ? deduped : undefined;
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
      if (value.trim() === '') return undefined;
      try {
        const parsed: unknown = JSON.parse(value);
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          Object.prototype.toString.call(parsed) === '[object Object]'
        ) {
          return parsed as Record<string, unknown>;
        } else {
          return undefined;
        }
      } catch {
        return undefined;
      }
    } else if (
      value !== null &&
      typeof value === 'object' &&
      Object.prototype.toString.call(value) === '[object Object]'
    ) {
      return value as Record<string, unknown>;
    } else {
      return undefined;
    }
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
