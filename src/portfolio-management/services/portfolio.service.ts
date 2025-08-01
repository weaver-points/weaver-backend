import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from '../entities/portfolio.entity';
import { Holding } from '../entities/holding.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { CreatePortfolioDto, UpdatePortfolioDto } from '../dto/portfolio.dto';
import { MarketDataService } from './market-data.service';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
    @InjectRepository(Holding)
    private holdingRepository: Repository<Holding>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private marketDataService: MarketDataService,
  ) {}

  async createPortfolio(createPortfolioDto: CreatePortfolioDto): Promise<Portfolio> {
    const portfolio = this.portfolioRepository.create({
      ...createPortfolioDto,
      rebalancingSettings: {
        threshold: 5, // 5% threshold by default
        frequency: 'monthly',
        enabled: true,
      },
    });

    return this.portfolioRepository.save(portfolio);
  }

  async getPortfoliosByUser(userId: string): Promise<Portfolio[]> {
    return this.portfolioRepository.find({
      where: { userId, isActive: true },
      relations: ['holdings'],
    });
  }

  async getPortfolioById(id: string): Promise<Portfolio> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: ['holdings', 'transactions', 'rebalancingRules'],
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    return portfolio;
  }

  async updatePortfolio(id: string, updatePortfolioDto: UpdatePortfolioDto): Promise<Portfolio> {
    await this.portfolioRepository.update(id, updatePortfolioDto);
    return this.getPortfolioById(id);
  }

  async deletePortfolio(id: string): Promise<void> {
    await this.portfolioRepository.update(id, { isActive: false });
  }

  async getPortfolioHoldings(portfolioId: string): Promise<Holding[]> {
    return this.holdingRepository.find({
      where: { portfolio: { id: portfolioId } },
    });
  }

  async addHolding(portfolioId: string, holdingData: any): Promise<Holding> {
    const portfolio = await this.getPortfolioById(portfolioId);
    const currentPrice = await this.marketDataService.getCurrentPrice(holdingData.symbol);
    
    const holding = this.holdingRepository.create({
      ...holdingData,
      portfolio,
      currentPrice,
      marketValue: holdingData.quantity * currentPrice,
    });

    const savedHolding = await this.holdingRepository.save(holding);

    // Create transaction record
    await this.transactionRepository.save({
      type: TransactionType.BUY,
      symbol: holdingData.symbol,
      quantity: holdingData.quantity,
      price: currentPrice,
      amount: holdingData.quantity * currentPrice,
      portfolio,
    });

    await this.updatePortfolioValue(portfolioId);
    return savedHolding;
  }

  async updatePortfolioValue(portfolioId: string): Promise<void> {
    const holdings = await this.getPortfolioHoldings(portfolioId);
    
    let totalValue = 0;
    for (const holding of holdings) {
      const currentPrice = await this.marketDataService.getCurrentPrice(holding.symbol);
      holding.currentPrice = currentPrice;
      holding.marketValue = holding.quantity * currentPrice;
      await this.holdingRepository.save(holding);
      totalValue += holding.marketValue;
    }

    const portfolio = await this.getPortfolioById(portfolioId);
    portfolio.totalValue = totalValue + portfolio.cashBalance;
    await this.portfolioRepository.save(portfolio);

    // Update allocation percentages
    await this.updateAllocationPercentages(portfolioId);
  }

  private async updateAllocationPercentages(portfolioId: string): Promise<void> {
    const portfolio = await this.getPortfolioById(portfolioId);
    const holdings = await this.getPortfolioHoldings(portfolioId);

    for (const holding of holdings) {
      holding.allocationPercentage = (holding.marketValue / portfolio.totalValue) * 100;
      await this.holdingRepository.save(holding);
    }
  }

  async getPortfolioPerformance(portfolioId: string, period: string): Promise<any> {
    // This would integrate with PerformanceTrackingService
    // Implementation would calculate returns, volatility, etc.
    return {
      portfolioId,
      period,
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
    };
  }
}