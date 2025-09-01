import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  PerformanceMetric,
  MetricType,
} from '../entities/performance-metric.entity';
import { TraderProfile } from '../entities/trader-profile.entity';
import { CopyTrade } from '../entities/copy-trade.entity';

export interface PerformanceAnalysis {
  returns: {
    daily: number[];
    weekly: number[];
    monthly: number[];
    cumulative: number;
  };
  risk: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    varDaily: number;
    beta?: number;
  };
  trading: {
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    totalTrades: number;
  };
  comparison?: {
    benchmark: string;
    alpha: number;
    correlation: number;
  };
}

export interface BacktestResult {
  strategy: string;
  period: { start: Date; end: Date };
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  trades: Array<{
    date: Date;
    action: string;
    instrument: string;
    quantity: number;
    price: number;
    pnl: number;
  }>;
}

@Injectable()
export class PerformanceAnalyticsService {
  constructor(
    @InjectRepository(PerformanceMetric)
    private metricsRepository: Repository<PerformanceMetric>,
    @InjectRepository(TraderProfile)
    private traderRepository: Repository<TraderProfile>,
    @InjectRepository(CopyTrade)
    private copyTradeRepository: Repository<CopyTrade>,
  ) {}

  async getTraderPerformance(
    traderId: string,
    days: number = 30,
  ): Promise<PerformanceAnalysis> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const metrics = await this.metricsRepository.find({
      where: {
        traderId,
        period: Between(startDate, endDate),
      },
      order: { period: 'ASC' },
    });

    const trader = await this.traderRepository.findOne({
      where: { id: traderId },
    });
    if (!trader) {
      throw new Error('Trader not found');
    }

    return {
      returns: {
        daily: metrics
          .filter((m) => m.type === MetricType.DAILY)
          .map((m) => m.return),
        weekly: metrics
          .filter((m) => m.type === MetricType.WEEKLY)
          .map((m) => m.return),
        monthly: metrics
          .filter((m) => m.type === MetricType.MONTHLY)
          .map((m) => m.return),
        cumulative: trader.totalReturn,
      },
      risk: {
        volatility: this.calculateVolatility(metrics.map((m) => m.return)),
        sharpeRatio: trader.sharpeRatio,
        maxDrawdown: trader.maxDrawdown,
        varDaily: this.calculateVaR(metrics.map((m) => m.return)),
      },
      trading: {
        winRate: trader.winRate,
        profitFactor: this.calculateProfitFactor(metrics),
        averageWin: this.calculateAverageWin(metrics),
        averageLoss: this.calculateAverageLoss(metrics),
        totalTrades: trader.totalTrades,
      },
    };
  }

  async compareTraders(traderIds: string[], period: number = 90): Promise<any> {
    const comparisons: any = [];

    for (const traderId of traderIds) {
      const performance = await this.getTraderPerformance(traderId, period);
      const trader = await this.traderRepository.findOne({
        where: { id: traderId },
      });

      comparisons.push({
        trader: trader?.username,
        performance,
        score: this.calculatePerformanceScore(performance),
      });
    }

    return comparisons.sort((a, b) => b.score - a.score);
  }

  async runBacktest(
    strategyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BacktestResult> {
    // This is a simplified backtest implementation
    // In a real system, this would use historical market data and strategy rules

    const initialCapital = 10000;
    let currentValue = initialCapital;
    const trades: any = [];

    // Simulate some trades
    const tradingDays = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    for (let i = 0; i < Math.min(tradingDays / 5, 50); i++) {
      const tradeDate = new Date(
        startDate.getTime() + i * 5 * 24 * 60 * 60 * 1000,
      );
      const action = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const quantity = Math.floor(Math.random() * 100) + 1;
      const price = 100 + Math.random() * 50;
      const pnl = (Math.random() - 0.5) * 200; // Random P&L between -100 and 100

      currentValue += pnl;

      trades.push({
        date: tradeDate,
        action,
        instrument: 'MOCK_STOCK',
        quantity,
        price,
        pnl,
      });
    }

    const totalReturn =
      ((currentValue - initialCapital) / initialCapital) * 100;
    const annualizedReturn = totalReturn * (365 / tradingDays);
    const returns = trades.map((t) => (t.pnl / initialCapital) * 100);
    const volatility = this.calculateVolatility(returns);
    const sharpeRatio = volatility > 0 ? annualizedReturn / volatility : 0;
    const maxDrawdown = this.calculateMaxDrawdown(trades);

    return {
      strategy: strategyId,
      period: { start: startDate, end: endDate },
      initialCapital,
      finalValue: currentValue,
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      trades,
    };
  }

  async getCopyTradeAnalytics(copyTradeId: string): Promise<any> {
    const copyTrade = await this.copyTradeRepository.findOne({
      where: { id: copyTradeId },
      relations: ['traderProfile'],
    });

    if (!copyTrade) {
      throw new Error('Copy trade not found');
    }

    const traderPerformance = await this.getTraderPerformance(
      copyTrade.traderProfileId,
    );

    return {
      copyTrade: {
        id: copyTrade.id,
        allocatedAmount: copyTrade.allocatedAmount,
        totalReturn: copyTrade.totalReturn,
        totalPnL: copyTrade.totalPnL,
        status: copyTrade.status,
        copyRatio: copyTrade.copyRatio,
      },
      trader: {
        username: copyTrade.traderProfile?.username,
        performance: traderPerformance,
      },
      correlation: this.calculateCorrelation(copyTrade, traderPerformance),
      slippage: this.calculateSlippage(copyTrade),
      fees: this.calculateFees(copyTrade),
    };
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      (returns.length - 1);

    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  private calculateVaR(
    returns: number[],
    confidenceLevel: number = 0.95,
  ): number {
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    return sortedReturns[index] || 0;
  }

  private calculateProfitFactor(metrics: PerformanceMetric[]): number {
    const totalWins = metrics.reduce((sum, m) => sum + Math.max(0, m.pnl), 0);
    const totalLosses = Math.abs(
      metrics.reduce((sum, m) => sum + Math.min(0, m.pnl), 0),
    );

    return totalLosses > 0 ? totalWins / totalLosses : 0;
  }

  private calculateAverageWin(metrics: PerformanceMetric[]): number {
    const wins = metrics.filter((m) => m.pnl > 0);
    return wins.length > 0
      ? wins.reduce((sum, m) => sum + m.pnl, 0) / wins.length
      : 0;
  }

  private calculateAverageLoss(metrics: PerformanceMetric[]): number {
    const losses = metrics.filter((m) => m.pnl < 0);
    return losses.length > 0
      ? losses.reduce((sum, m) => sum + m.pnl, 0) / losses.length
      : 0;
  }

  private calculatePerformanceScore(performance: PerformanceAnalysis): number {
    const returnWeight = 0.3;
    const sharpeWeight = 0.3;
    const winRateWeight = 0.2;
    const drawdownWeight = 0.2;

    const returnScore = Math.min(performance.returns.cumulative / 100, 2);
    const sharpeScore = Math.min(performance.risk.sharpeRatio / 3, 1);
    const winRateScore = performance.trading.winRate / 100;
    const drawdownScore = Math.max(0, 1 - performance.risk.maxDrawdown / 50);

    return (
      (returnScore * returnWeight +
        sharpeScore * sharpeWeight +
        winRateScore * winRateWeight +
        drawdownScore * drawdownWeight) *
      100
    );
  }

  private calculateMaxDrawdown(trades: any[]): number {
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;

    trades.forEach((trade) => {
      cumulative += trade.pnl;
      peak = Math.max(peak, cumulative);
      const drawdown = ((peak - cumulative) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });

    return maxDrawdown;
  }

  private calculateCorrelation(
    copyTrade: CopyTrade,
    traderPerformance: PerformanceAnalysis,
  ): number {
    // Simplified correlation calculation
    // In a real implementation, this would compare actual returns
    return 0.85 + (Math.random() - 0.5) * 0.3;
  }

  private calculateSlippage(copyTrade: CopyTrade): number {
    // Average slippage as percentage
    return 0.02 + Math.random() * 0.03;
  }

  private calculateFees(copyTrade: CopyTrade): any {
    const managementFee = copyTrade.allocatedAmount * 0.02; // 2% annual
    const performanceFee = Math.max(0, copyTrade.totalPnL) * 0.2; // 20% of profits

    return {
      management: managementFee,
      performance: performanceFee,
      total: managementFee + performanceFee,
    };
  }
}
