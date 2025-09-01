import { Injectable } from '@nestjs/common';
import { RiskManagementService } from '../services/risk-management.service';

export interface RiskParameters {
  maxDrawdown: number;
  maxDailyLoss: number;
  maxConcentration: number;
  varLimit: number;
  correlationLimit: number;
}

@Injectable()
export class RiskManagementStrategy {
  constructor(private riskService: RiskManagementService) {}

  async evaluatePortfolioRisk(
    followerId: string,
    params: RiskParameters,
  ): Promise<boolean> {
    const portfolioRisk =
      await this.riskService.calculatePortfolioRisk(followerId);

    // Check maximum drawdown
    if (portfolioRisk.drawdown > params.maxDrawdown) {
      return false;
    }

    // Check VaR limit
    if (portfolioRisk.varDaily > params.varLimit) {
      return false;
    }

    // Check concentration limits
    const maxConcentration = Math.max(
      ...Object.values(portfolioRisk.concentration),
    );
    if (maxConcentration > params.maxConcentration) {
      return false;
    }

    return true;
  }

  async adjustRiskExposure(
    followerId: string,
    targetRisk: number,
  ): Promise<any> {
    const currentRisk =
      await this.riskService.calculatePortfolioRisk(followerId);

    // Calculate required adjustments
    const adjustments = {
      reduceExposure: currentRisk.varDaily > targetRisk,
      rebalancePortfolio:
        Math.max(...Object.values(currentRisk.concentration)) > 25,
      pauseTrading: currentRisk.drawdown > 15,
    };

    return adjustments;
  }
}
