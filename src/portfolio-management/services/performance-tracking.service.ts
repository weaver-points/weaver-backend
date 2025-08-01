import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceMetric } from '../entities/performance-metric.entity';
import { PortfolioService } from './portfolio.service';
import { MarketDataService } from './market-data.service';

@Injectable()
export class PerformanceTrackingService {
  constructor(
    @InjectRepository(PerformanceMetric)
    private performanceMetricRepository: Repository<PerformanceMetric>,
    private portfolioService: PortfolioService,
    private marketDataService: MarketDataService,
  ) {}

  async calculatePerformanceMetrics(portfolioId: string, period: string): Promise<PerformanceMetric> {
    const portfolio = await this.portfolioService.getPortfolioById(portfolioId);
    const holdings = await this.portfolioService.getPortfolioHoldings(portfolioId);
    
    const periodDays = this.getPeriodDays(period);
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    
    const portfolioReturns = await this.calculatePortfolioReturns(holdings, periodDays);
    const benchmarkReturns = await this.getBenchmarkReturns(period);
    
    const totalReturn = this.calculateTotalReturn(portfolioReturns);
    const totalReturnPercentage = (totalReturn / portfolio.totalValue) * 100;
    const annualizedReturn = this.calculateAnnualizedReturn(totalReturnPercentage, periodDays);
    const volatility = this.calculateVolatility(portfolioReturns);
    const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility);
    const maxDrawdown = this.calculateMaxDrawdown(portfolioReturns);
    const beta = this.calculateBeta(portfolioReturns, benchmarkReturns);
    const alpha = this.calculateAlpha(annualizedReturn, beta, benchmarkReturns);

    const performanceMetric = this.performanceMetricRepository.create({
      portfolioId,
      totalReturn,
      totalReturnPercentage,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      beta,
      alpha,
      periodStart,
      periodEnd: new Date(),
    });

    return this.performanceMetricRepository.save(performanceMetric);
  }

  private getPeriodDays(period: string): number {
    const periodMap = {
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '2Y': 730,
      '5Y': 1825,
    };
    return periodMap[period] || 365;
  }

  private async calculatePortfolioReturns(holdings: any[], days: number): Promise<number[]> {
    const returns = [];
    
    for (let i = 0; i < days; i++) {
      let dailyReturn = 0;
      
      for (const holding of holdings) {
        const historicalPrices = await this.marketDataService.getHistoricalPrices(
          holding.symbol,
          days,
        );
        
        if (historicalPrices.length > i + 1) {
          const todayPrice = historicalPrices[i];
          const yesterdayPrice = historicalPrices[i + 1];
          const holdingReturn = (todayPrice - yesterdayPrice) / yesterdayPrice;
          const weight = holding.marketValue / holdings.reduce((sum, h) => sum + h.marketValue, 0);
          
          dailyReturn += holdingReturn * weight;
        }
      }
      
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  private async getBenchmarkReturns(period: string): Promise<number[]> {
    // Get S&P 500 returns as benchmark
    const spy = await this.marketDataService.getHistoricalReturns('SPY', this.getPeriodDays(period));
    return spy;
  }

  private calculateTotalReturn(returns: number[]): number {
    return returns.reduce((total, ret) => total + ret, 0);
  }

  private calculateAnnualizedReturn(totalReturnPercent: number, days: number): number {
    return Math.pow(1 + totalReturnPercent / 100, 365 / days) - 1;
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252) * 100; // Annualized volatility
  }

  private calculateSharpeRatio(annualizedReturn: number, volatility: number): number {
    const riskFreeRate = 0.02; // 2% risk-free rate
    return (annualizedReturn - riskFreeRate) / (volatility / 100);
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0;
    let peak = 1;
    let current = 1;
    
    for (const ret of returns) {
      current *= (1 + ret);
      if (current > peak) {
        peak = current;
      }
      const drawdown = (peak - current) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100;
  }

  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
    
    const portfolioMean = portfolioReturns.slice(0, n).reduce((sum, ret) => sum + ret, 0) / n;
    const benchmarkMean = benchmarkReturns.slice(0, n).reduce((sum, ret) => sum + ret, 0) / n;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < n; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      covariance += portfolioDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }
    
    return covariance / benchmarkVariance;
  }

  private calculateAlpha(portfolioReturn: number, beta: number, benchmarkReturns: number[]): number {
    const benchmarkReturn = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length * 252;
    const riskFreeRate = 0.02;
    
    return portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
  }

  async getOptimizationSuggestions(portfolioId: string): Promise<any> {
    const portfolio = await this.portfolioService.getPortfolioById(portfolioId);
    const performanceMetrics = await this.calculatePerformanceMetrics(portfolioId, '1Y');
    
    const suggestions = [];
    
    // Low Sharpe ratio suggestion
    if (performanceMetrics.sharpeRatio < 1.0) {
      suggestions.push({
        type: 'risk_adjustment',
        priority: 'high',
        title: 'Improve Risk-Adjusted Returns',
        description: 'Consider reducing high-volatility assets or adding defensive positions',
        impact: 'Could improve Sharpe ratio by 0.2-0.5 points',
      });
    }
    
    // High volatility suggestion
    if (performanceMetrics.volatility > 20) {
      suggestions.push({
        type: 'volatility_reduction',
        priority: 'medium',
        title: 'Reduce Portfolio Volatility',
        description: 'Add bonds or low-volatility ETFs to reduce overall portfolio risk',
        impact: 'Could reduce volatility by 5-10%',
      });
    }
    
    // Poor performance suggestion
    if (performanceMetrics.alpha < -2) {
      suggestions.push({
        type: 'performance_improvement',
        priority: 'high',
        title: 'Underperforming Benchmark',
        description: 'Consider index funds or review individual stock selections',
        impact: 'Could improve alpha by 1-3%',
      });
    }
    
    return {
      portfolioId,
      suggestions,
      currentMetrics: performanceMetrics,
    };
  }
}