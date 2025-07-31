import { IsString, IsEnum, IsOptional, IsNumber, IsObject, IsBoolean } from 'class-validator';
import { PortfolioType, RiskTolerance } from '../entities/portfolio.entity';

export class CreatePortfolioDto {
  @IsString()
  name: string;

  @IsString()
  userId: string;

  @IsEnum(PortfolioType)
  @IsOptional()
  type?: PortfolioType;

  @IsEnum(RiskTolerance)
  @IsOptional()
  riskTolerance?: RiskTolerance;

  @IsNumber()
  @IsOptional()
  cashBalance?: number;

  @IsObject()
  @IsOptional()
  targetAllocation?: Record<string, number>;

  @IsObject()
  @IsOptional()
  rebalancingSettings?: {
    threshold: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    enabled: boolean;
  };
}

export class UpdatePortfolioDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(PortfolioType)
  @IsOptional()
  type?: PortfolioType;

  @IsEnum(RiskTolerance)
  @IsOptional()
  riskTolerance?: RiskTolerance;

  @IsNumber()
  @IsOptional()
  cashBalance?: number;

  @IsObject()
  @IsOptional()
  targetAllocation?: Record<string, number>;

  @IsObject()
  @IsOptional()
  rebalancingSettings?: {
    threshold: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    enabled: boolean;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddHoldingDto {
  @IsString()
  symbol: string;

  @IsString()
  assetName: string;

  @IsString()
  assetClass: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  averageCost: number;
}
