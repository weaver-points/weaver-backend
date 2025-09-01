import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { CopyTradeStatus, RiskLevel } from '../entities/copy-trade.entity';

export class CreateCopyTradeDto {
  @IsString()
  traderProfileId: string;

  @IsNumber()
  @Min(1)
  allocatedAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  copyRatio?: number;

  @IsOptional()
  @IsNumber()
  stopLoss?: number;

  @IsOptional()
  @IsNumber()
  takeProfit?: number;

  @IsOptional()
  @IsNumber()
  maxDailyLoss?: number;

  @IsOptional()
  @IsNumber()
  maxPositionSize?: number;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsArray()
  allowedInstruments?: string[];

  @IsOptional()
  @IsArray()
  excludedInstruments?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateCopyTradeDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  allocatedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  copyRatio?: number;

  @IsOptional()
  @IsNumber()
  stopLoss?: number;

  @IsOptional()
  @IsNumber()
  takeProfit?: number;

  @IsOptional()
  @IsEnum(CopyTradeStatus)
  status?: CopyTradeStatus;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsArray()
  allowedInstruments?: string[];

  @IsOptional()
  @IsArray()
  excludedInstruments?: string[];
}
