import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CopyTrade, RiskLevel } from '../entities/copy-trade.entity';

export interface TradeValidationRequest {
  instrument: string;
  quantity: number;
  price: number;
  action: 'BUY' | 'SELL' | 'CLOSE';
}

export interface RiskValidationResult {
  approved: boolean;
  reason?: string;
  maxAllowedQuantity?: number;
  riskScore: number;
}

export interface PortfolioRisk {
  totalExposure: number;
  concentration: { [instrument: string]: number };
  drawdown: number;
  volatility: number;
  varDaily: number; // Value at Risk
}

@Injectable()
export class RiskManagementService {
  constructor(
    @InjectRepository(CopyTrade)
    private copyTradeRepository: Repository<CopyTrade>,
  ) {}

  async validateTrade(
    copyTrade: CopyTrade,
    trade: TradeValidationRequest,
  ): Promise<RiskValidationResult> {
    const tradeValue = trade.quantity * trade.price;
    let riskScore = 0;

    // Position size check
    if (copyTrade.maxPositionSize && tradeValue > copyTrade.maxPositionSize) {
      return {
        approved: false,
        reason: 'Trade exceeds maximum position size',
        riskScore: 100,
      };
    }

    // Portfolio exposure check
    const maxAllowedExposure =
      copyTrade.allocatedAmount * this.getRiskMultiplier(copyTrade.riskLevel);
    if (tradeValue > maxAllowedExposure) {
      const maxQuantity = Math.floor(maxAllowedExposure / trade.price);
      return {
        approved: maxQuantity > 0,
        reason:
          maxQuantity > 0
            ? 'Reduced position size due to risk limits'
            : 'Trade exceeds risk tolerance',
        maxAllowedQuantity: maxQuantity,
        riskScore: 75,
      };
    }

    // Daily loss limit check
    if (copyTrade.maxDailyLoss) {
      const todayPnL = await this.getDailyPnL(copyTrade.id);
      if (Math.abs(todayPnL) >= copyTrade.maxDailyLoss) {
        return {
          approved: false,
          reason: 'Daily loss limit reached',
          riskScore: 90,
        };
      }
    }

    // Calculate risk score
    riskScore = this.calculateTradeRiskScore(copyTrade, trade);

    return {
      approved: true,
      riskScore,
      maxAllowedQuantity: trade.quantity,
    };
  }

  private getRiskMultiplier(riskLevel: RiskLevel): number {
    const multipliers = {
      [RiskLevel.LOW]: 0.5,
      [RiskLevel.MEDIUM]: 1.0,
      [RiskLevel.HIGH]: 2.0,
      [RiskLevel.VERY_HIGH]: 5.0,
    };
    return multipliers[riskLevel] || 1.0;
  }

  private calculateTradeRiskScore(
    copyTrade: CopyTrade,
    trade: TradeValidationRequest,
  ): number {
    const positionSizeRatio =
      (trade.quantity * trade.price) / copyTrade.allocatedAmount;
    const baseScore = positionSizeRatio * 100;

    // Adjust based on risk level
    const riskMultiplier = this.getRiskMultiplier(copyTrade.riskLevel);
    return Math.min(baseScore / riskMultiplier, 100);
  }

  private async getDailyPnL(copyTradeId: string): Promise<number> {
    // In a real implementation, this would query actual trade records
    // For now, return a mock value
    return 0;
  }

  async calculatePortfolioRisk(followerId: string): Promise<PortfolioRisk> {
    const copyTrades = await this.copyTradeRepository.find({
      where: { followerId },
      relations: ['traderProfile'],
    });

    const totalAllocated = copyTrades.reduce(
      (sum, ct) => sum + ct.allocatedAmount,
      0,
    );
    const concentrationMap: { [trader: string]: number } = {};

    copyTrades.forEach((ct) => {
      const traderName = ct.traderProfile?.username || 'Unknown';
      concentrationMap[traderName] =
        (concentrationMap[traderName] || 0) + ct.allocatedAmount;
    });

    // Normalize concentration
    Object.keys(concentrationMap).forEach((trader) => {
      concentrationMap[trader] =
        (concentrationMap[trader] / totalAllocated) * 100;
    });

    return {
      totalExposure: totalAllocated,
      concentration: concentrationMap,
      drawdown: this.calculateDrawdown(copyTrades),
      volatility: this.calculateVolatility(copyTrades),
      varDaily: this.calculateVaR(copyTrades),
    };
  }

  private calculateDrawdown(copyTrades: CopyTrade[]): number {
    // Simplified drawdown calculation
    return copyTrades.reduce((max, ct) => {
      const drawdown = Math.abs(Math.min(0, ct.totalPnL));
      return Math.max(max, (drawdown / ct.allocatedAmount) * 100);
    }, 0);
  }

  private calculateVolatility(copyTrades: CopyTrade[]): number {
    // Simplified volatility calculation
    if (copyTrades.length === 0) return 0;

    const returns = copyTrades.map((ct) => ct.totalReturn);
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      returns.length;

    return Math.sqrt(variance);
  }

  private calculateVaR(
    copyTrades: CopyTrade[],
    confidenceLevel: number = 0.95,
  ): number {
    // Simplified VaR calculation using normal distribution assumption
    const totalValue = copyTrades.reduce(
      (sum, ct) => sum + ct.allocatedAmount,
      0,
    );
    const volatility = this.calculateVolatility(copyTrades) / 100; // Convert to decimal

    // Z-score for 95% confidence level
    const zScore = 1.645;
    return totalValue * volatility * zScore;
  }
}
