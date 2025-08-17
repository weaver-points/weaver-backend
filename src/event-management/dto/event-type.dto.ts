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
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEventTypeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Event type key must contain only alphanumeric characters, dots, hyphens, and underscores',
  })
  key!: string;

  @IsEnum(['protocol', 'user', 'system'])
  category!: 'protocol' | 'user' | 'system';

  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        throw new Error('Invalid JSON schema format');
      }
    }
    return value as Record<string, unknown>;
  })
  jsonSchema!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return (value || []) as string[];
  })
  tags?: string[];
}
