import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskMetric } from '../entities/risk-metric.entity';
import { PortfolioService } from './portfolio.service';
import { MarketDataService } from './market-data.service';

@Injectable()
export class RiskAssessmentService {
  constructor(
    @InjectRepository(RiskMetric)
    private riskMetricRepository: Repository<RiskMetric>,
    private portfolioService: PortfolioService,
    private marketDataService: MarketDataService,
  ) {}

  async assessPortfolioRisk(portfolioId: string): Promise<RiskMetric> {
    const portfolio = await this.portfolioService.getPortfolioById(portfolioId);
    const holdings = await this.portfolioService.getPortfolioHoldings(portfolioId);

    // Calculate various risk metrics
    const valueAtRisk = await this.calculateVaR(holdings);
    const conditionalVaR = await this.calculateCVaR(holdings);
    const concentrationRisk = this.calculateConcentrationRisk(holdings);
    const correlationRisk = await this.calculateCorrelationRisk(holdings);
    const sectorExposure = this.calculateSectorExposure(holdings);
    const geographicExposure = this.calculateGeographicExposure(holdings);
    const riskScore = this.calculateOverallRiskScore({
      concentrationRisk,
      correlationRisk,
      portfolio,
    });

    const riskMetric = this.riskMetricRepository.create({
      portfolioId,
      valueAtRisk,
      conditionalVaR,
      concentrationRisk,
      correlationRisk,
      sectorExposure,
      geographicExposure,
      riskScore,
    });

    return this.riskMetricRepository.save(riskMetric);
  }

  private async calculateVaR(holdings: any[]): Promise<number> {
    // Simplified VaR calculation using historical simulation
    // In production, you'd use more sophisticated methods
    let portfolioVaR = 0;
    
    for (const holding of holdings) {
      const historicalReturns = await this.marketDataService.getHistoricalReturns(
        holding.symbol,
        252, // 1 year of trading days
      );
      
      const sortedReturns = historicalReturns.sort((a, b) => a - b);
      const varIndex = Math.floor(0.05 * sortedReturns.length); // 5% VaR
      const holdingVaR = sortedReturns[varIndex] * holding.marketValue;
      
      portfolioVaR += holdingVaR * holdingVaR; // Simplified correlation assumption
    }
    
    return Math.sqrt(portfolioVaR);
  }

  private async calculateCVaR(holdings: any[]): Promise<number> {
    // Conditional VaR (Expected Shortfall)
    const vaR = await this.calculateVaR(holdings);
    return vaR * 1.3; // Simplified calculation
  }

  private calculateConcentrationRisk(holdings: any[]): number {
    // Herfindahl-Hirschman Index for concentration
    let hhi = 0;
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    
    for (const holding of holdings) {
      const weight = holding.marketValue / totalValue;
      hhi += weight * weight;
    }
    
    return hhi * 100; // Convert to percentage scale
  }

  private async calculateCorrelationRisk(holdings: any[]): Promise<number> {
    // Simplified correlation risk calculation
    // In production, you'd calculate actual correlation matrix
    const sectorCounts = {};
    
    for (const holding of holdings) {
      const sector = await this.marketDataService.getAssetSector(holding.symbol);
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    }
    
    const sectors = Object.keys(sectorCounts);
    const diversificationScore = Math.min(sectors.length / 10, 1); // Max 10 sectors
    
    return (1 - diversificationScore) * 100;
  }

  private calculateSectorExposure(holdings: any[]): Record<string, number> {
    const sectorExposure = {};
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    
    for (const holding of holdings) {
      const sector = holding.assetClass; // Simplified - could be more granular
      const exposure = (holding.marketValue / totalValue) * 100;
      sectorExposure[sector] = (sectorExposure[sector] || 0) + exposure;
    }
    
    return sectorExposure;
  }

  private calculateGeographicExposure(holdings: any[]): Record<string, number> {
    // Simplified geographic exposure
    const geoExposure = { 'US': 70, 'International': 30 }; // Default allocation
    return geoExposure;
  }

  private calculateOverallRiskScore(metrics: any): number {
    const { concentrationRisk, correlationRisk, portfolio } = metrics;
    
    let score = 5; // Base score
    
    // Adjust based on concentration
    if (concentrationRisk > 25) score += 2;
    else if (concentrationRisk > 15) score += 1;
    
    // Adjust based on correlation
    if (correlationRisk > 70) score += 2;
    else if (correlationRisk > 50) score += 1;
    
    // Adjust based on portfolio type
    if (portfolio.riskTolerance === 'HIGH') score += 1;
    else if (portfolio.riskTolerance === 'LOW') score -= 1;
    
    return Math.min(Math.max(score, 1), 10);
  }
}