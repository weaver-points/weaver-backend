import {
  IsDefined,
  IsEnum,
  IsISO8601,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  IsNotEmpty,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EventSeverity } from '../entities/event.entity';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Event type must contain only alphanumeric characters, dots, hyphens, and underscores',
  })
  type!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  source?: string;

  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  @Transform(
    ({ value }) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as Record<string, unknown>;
        } catch (error) {
          throw new Error(`Invalid JSON payload: ${String(error)}`);
        }
      }
      return value as Record<string, unknown>;
    },
    { toClassOnly: true },
  )
  payload!: Record<string, unknown>;

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
    return value as Record<string, unknown>;
  })
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'User ID must contain only alphanumeric characters, dots, hyphens, and underscores',
  })
  userId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  correlationId?: string;

  @IsOptional()
  @IsEnum(EventSeverity)
  severity?: EventSeverity;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Stream name must contain only alphanumeric characters, dots, hyphens, and underscores',
  })
  stream?: string;
}
