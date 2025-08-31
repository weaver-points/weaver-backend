import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Portfolio } from '../entities/portfolio.entity';
import { Holding } from '../entities/holding.entity';
import { RebalancingRule } from '../entities/rebalancing-rule.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { PortfolioService } from './portfolio.service';
import { TradingExecutionService } from './trading-execution.service';

export interface RebalancingAnalysis {
  portfolioId: string;
  currentAllocations: Record<string, number>;
  targetAllocations: Record<string, number>;
  deviations: Record<string, number>;
  rebalancingNeeded: boolean;
  suggestedTrades: Array<{
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    amount: number;
  }>;
}

@Injectable()
export class RebalancingService {
  constructor(
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
    @InjectRepository(Holding)
    private holdingRepository: Repository<Holding>,
    @InjectRepository(RebalancingRule)
    private rebalancingRuleRepository: Repository<RebalancingRule>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private portfolioService: PortfolioService,
    private tradingExecutionService: TradingExecutionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runAutomaticRebalancing(): Promise<void> {
    const portfolios = await this.portfolioRepository.find({
      where: { isActive: true },
      relations: ['rebalancingRules'],
    });

    for (const portfolio of portfolios) {
      if (portfolio.rebalancingSettings?.enabled) {
        const analysis = await this.analyzeRebalancing(portfolio.id);

        if (analysis.rebalancingNeeded) {
          await this.executeRebalancing(portfolio.id, { automatic: true });
        }
      }
    }
  }

  async analyzeRebalancing(portfolioId: string): Promise<RebalancingAnalysis> {
    const portfolio = await this.portfolioService.getPortfolioById(portfolioId);
    const holdings =
      await this.portfolioService.getPortfolioHoldings(portfolioId);

    const currentAllocations: Record<string, number> = {};
    const targetAllocations = portfolio.targetAllocation || {};
    const deviations: Record<string, number> = {};

    // Calculate current allocations
    for (const holding of holdings) {
      const allocationKey = holding.assetClass;
      currentAllocations[allocationKey] =
        (currentAllocations[allocationKey] || 0) + holding.allocationPercentage;
    }

    // Calculate deviations
    let rebalancingNeeded = false;
    const threshold = portfolio.rebalancingSettings?.threshold || 5;

    for (const [assetClass, targetPercent] of Object.entries(
      targetAllocations,
    )) {
      const currentPercent = currentAllocations[assetClass] || 0;
      const deviation = Math.abs(currentPercent - targetPercent);
      deviations[assetClass] = deviation;

      if (deviation > threshold) {
        rebalancingNeeded = true;
      }
    }

    const suggestedTrades = this.calculateRebalancingTrades(
      portfolio,
      holdings,
      currentAllocations,
      targetAllocations,
    );

    return {
      portfolioId,
      currentAllocations,
      targetAllocations,
      deviations,
      rebalancingNeeded,
      suggestedTrades,
    };
  }

  private calculateRebalancingTrades(
    portfolio: Portfolio,
    holdings: Holding[],
    currentAllocations: Record<string, number>,
    targetAllocations: Record<string, number>,
  ): Array<{
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    amount: number;
  }> {
    const trades = [];
    const totalValue = portfolio.totalValue;

    for (const [assetClass, targetPercent] of Object.entries(
      targetAllocations,
    )) {
      const currentPercent = currentAllocations[assetClass] || 0;
      const targetValue = (targetPercent / 100) * totalValue;
      const currentValue = (currentPercent / 100) * totalValue;
      const difference = targetValue - currentValue;

      if (Math.abs(difference) > 100) {
        // Only trade if difference > $100
        const action = difference > 0 ? 'buy' : 'sell';
        const amount = Math.abs(difference);

        // Find representative holding for this asset class
        const holding = holdings.find((h) => h.assetClass === assetClass);
        if (holding) {
          const quantity = amount / holding.currentPrice;

          trades.push({
            symbol: holding.symbol,
            action,
            quantity: Math.abs(quantity),
            amount: Math.abs(amount),
          });
        }
      }
    }

    return trades;
  }

  async executeRebalancing(
    portfolioId: string,
    options: any = {},
  ): Promise<void> {
    try {
      const analysis = await this.analyzeRebalancing(portfolioId);
      const portfolio =
        await this.portfolioService.getPortfolioById(portfolioId);

      for (const trade of analysis.suggestedTrades) {
        // Execute trade through trading service
        const executionResult = await this.tradingExecutionService.executeTrade(
          {
            portfolioId,
            symbol: trade.symbol,
            action: trade.action,
            quantity: trade.quantity,
            orderType: 'market',
          },
        );

        if (executionResult.success) {
          // Record transaction
          await this.transactionRepository.save({
            type: TransactionType.REBALANCE,
            symbol: trade.symbol,
            quantity: trade.action === 'buy' ? trade.quantity : -trade.quantity,
            price: executionResult.executedPrice,
            amount: trade.amount,
            description: `Automatic rebalancing ${trade.action}`,
            portfolio,
          });
        }
      }

      // Update portfolio values after rebalancing
      await this.portfolioService.updatePortfolioValue(portfolioId);
    } catch (error) {
      console.error('Rebalancing execution failed:', error);
      throw error;
    }
  }

  async getRebalancingHistory(portfolioId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        portfolio: { id: portfolioId },
        type: TransactionType.REBALANCE,
      },
      order: { executedAt: 'DESC' },
    });
  }
}
