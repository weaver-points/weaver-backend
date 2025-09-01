import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { MetricType } from '../entities/performance-metric.entity';

export class StrategyPerformanceDto {
  @IsString()
  traderId: string;

  @IsOptional()
  @IsEnum(MetricType)
  type?: MetricType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PerformanceAnalyticsDto {
  @IsString()
  traderId: string;

  @IsOptional()
  @IsNumber()
  days?: number;

  @IsOptional()
  @IsString()
  benchmark?: string;
}
