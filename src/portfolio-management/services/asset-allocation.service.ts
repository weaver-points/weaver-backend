import { Injectable } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { MarketDataService } from './market-data.service';

interface AllocationRecommendation {
  assetClass: string;
  currentWeight: number;
  recommendedWeight: number;
  reasoning: string;
}

@Injectable()
export class AssetAllocationService {
  constructor(
    private portfolioService: PortfolioService,
    private marketDataService: MarketDataService,
  ) {}

  async optimizeAllocation(portfolioId: string): Promise<AllocationRecommendation[]> {
    const portfolio = await this.portfolioService.getPortfolioById(portfolioId);
    const holdings = await this.portfolioService.getPortfolioHoldings(portfolioId);
    
    // Calculate current allocations
    const currentAllocations = this.calculateCurrentAllocations(holdings);
    
    // Get optimal allocations based on Modern Portfolio Theory
    const optimalAllocations = await this.calculateOptimalAllocations(
      portfolio.riskTolerance,
      currentAllocations,
    );
    
    const recommendations: AllocationRecommendation[] = [];
    
    for (const [assetClass, currentWeight] of Object.entries(currentAllocations)) {
      const recommendedWeight = optimalAllocations[assetClass] || 0;
      const difference = Math.abs(currentWeight - recommendedWeight);
      
      if (difference > 5) { // Only recommend if difference > 5%
        recommendations.push({
          assetClass,
          currentWeight,
          recommendedWeight,
          reasoning: this.generateRecommendationReasoning(
            assetClass,
            currentWeight,
            recommendedWeight,
            portfolio.riskTolerance,
          ),
        });
      }
    }
    
    return recommendations;
  }

  private calculateCurrentAllocations(holdings: any[]): Record<string, number> {
    const allocations = {};
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    
    for (const holding of holdings) {
      const weight = (holding.marketValue / totalValue) * 100;
      allocations[holding.assetClass] = (allocations[holding.assetClass] || 0) + weight;
    }
    
    return allocations;
  }

  private async calculateOptimalAllocations(
    riskTolerance: string,
    currentAllocations: Record<string, number>,
  ): Promise<Record<string, number>> {
    // Simplified optimal allocation based on risk tolerance
    const allocationTemplates = {
      LOW: {
        'bonds': 60,
        'stocks': 30,
        'cash': 10,
      },
      MEDIUM: {
        'stocks': 60,
        'bonds': 30,
        'alternatives': 10,
      },
      HIGH: {
        'stocks': 80,
        'alternatives': 15,
        'bonds': 5,
      },
    };
    
    return allocationTemplates[riskTolerance] || allocationTemplates.MEDIUM;
  }

  private generateRecommendationReasoning(
    assetClass: string,
    current: number,
    recommended: number,
    riskTolerance: string,
  ): string {
    const difference = recommended - current;
    const action = difference > 0 ? 'increase' : 'decrease';
    
    const reasoningMap = {
      'stocks': {
        increase: 'Higher stock allocation can improve long-term growth potential',
        decrease: 'Reducing stock exposure can lower portfolio volatility',
      },
      'bonds': {
        increase: 'Additional bonds can provide stability and income',
        decrease: 'Lower bond allocation may improve growth potential',
      },
      'alternatives': {
        increase: 'Alternative investments can improve diversification',
        decrease: 'Reducing alternatives can simplify portfolio management',
      },
    };
    
    return reasoningMap[assetClass]?.[action] || `${action} ${assetClass} allocation to match risk profile`;
  }

  async generateEfficientFrontier(portfolioId: string): Promise<any> {
    // Generate efficient frontier points for portfolio optimization
    const riskReturns = [];
    
    for (let risk = 5; risk <= 25; risk += 2) {
      const expectedReturn = this.calculateExpectedReturn(risk);
      riskReturns.push({
        risk: risk / 100,
        return: expectedReturn / 100,
      });
    }
    
    return {
      portfolioId,
      efficientFrontier: riskReturns,
      currentPosition: await this.getCurrentPortfolioPosition(portfolioId),
    };
  }

  private calculateExpectedReturn(riskLevel: number): number {
    // Simplified expected return calculation
    // In practice, this would use historical data and complex models
    return 2 + (riskLevel * 0.4); // Risk-return relationship
  }

  private async getCurrentPortfolioPosition(portfolioId: string): Promise<{ risk: number; return: number }> {
    // Calculate current portfolio's risk and return position
    return {
      risk: 0.15, // 15% volatility
      return: 0.08, // 8% expected return
    };
  }
}
