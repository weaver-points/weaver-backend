import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { PortfolioService } from './portfolio.service';
import { TradingExecutionService } from './trading-execution.service';

interface TaxLossOpportunity {
  holdingId: string;
  symbol: string;
  unrealizedLoss: number;
  purchaseDate: Date;
  washSaleRisk: boolean;
  replacementSuggestions: string[];
}

@Injectable()
export class TaxLossHarvestingService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private portfolioService: PortfolioService,
    private tradingExecutionService: TradingExecutionService,
  ) {}

  async identifyTaxLossOpportunities(portfolioId: string): Promise<TaxLossOpportunity[]> {
    const holdings = await this.portfolioService.getPortfolioHoldings(portfolioId);
    const opportunities: TaxLossOpportunity[] = [];
    
    for (const holding of holdings) {
      const unrealizedLoss = (holding.averageCost - holding.currentPrice) * holding.quantity;
      
      if (unrealizedLoss > 100) { // Only consider losses > $100
        const purchaseTransactions = await this.getPurchaseTransactions(portfolioId, holding.symbol);
        const lastPurchase = purchaseTransactions[0]?.executedAt;
        const washSaleRisk = await this.checkWashSaleRisk(portfolioId, holding.symbol);
        const replacementSuggestions = await this.getReplacementSuggestions(holding.symbol);
        
        opportunities.push({
          holdingId: holding.id,
          symbol: holding.symbol,
          unrealizedLoss: Math.abs(unrealizedLoss),
          purchaseDate: lastPurchase,
          washSaleRisk,
          replacementSuggestions,
        });
      }
    }
    
    return opportunities.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);
  }

  private async getPurchaseTransactions(portfolioId: string, symbol: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        portfolio: { id: portfolioId },
        symbol,
        type: TransactionType.BUY,
      },
      order: { executedAt: 'DESC' },
    });
  }

  private async checkWashSaleRisk(portfolioId: string, symbol: string): Promise<boolean> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = await this.transactionRepository.find({
      where: {
        portfolio: { id: portfolioId },
        symbol,
        executedAt: { $gte: thirtyDaysAgo } as any,
      },
    });
    
    return recentTransactions.some(tx => tx.type === TransactionType.BUY);
  }

  private async getReplacementSuggestions(symbol: string): Promise<string[]> {
    // In production, this would use sophisticated similarity algorithms
    // For now, return generic alternatives based on asset class
    const assetClassReplacements = {
      'SPY': ['VTI', 'ITOT', 'SCHA'],
      'QQQ': ['VGT', 'XLK', 'FTEC'],
      'AAPL': ['MSFT', 'GOOGL', 'VGT'],
      // Add more mappings
    };
    
    return assetClassReplacements[symbol] || ['VTI', 'VXUS']; // Default broad market alternatives
  }

  async executeTaxLossHarvesting(
    portfolioId: string,
    opportunityId: string,
    replacementSymbol?: string,
  ): Promise<void> {
    const opportunities = await this.identifyTaxLossOpportunities(portfolioId);
    const opportunity = opportunities.find(o => o.holdingId === opportunityId);
    
    if (!opportunity || opportunity.washSaleRisk) {
      throw new Error('Cannot execute tax loss harvesting due to wash sale risk');
    }
    
    const portfolio = await this.portfolioService.getPortfolioById(portfolioId);
    const holdings = await this.portfolioService.getPortfolioHoldings(portfolioId);
    const holding = holdings.find(h => h.id === opportunityId);
    
    if (!holding) {
      throw new Error('Holding not found');
    }
    
    try {
      // Sell the losing position
      const sellResult = await this.tradingExecutionService.executeTrade({
        portfolioId,
        symbol: holding.symbol,
        action: 'sell',
        quantity: holding.quantity,
        orderType: 'market',
      });
      
      if (sellResult.success) {
        // Record tax loss harvesting transaction
        await this.transactionRepository.save({
          type: TransactionType.TAX_LOSS_HARVEST,
          symbol: holding.symbol,
          quantity: -holding.quantity,
          price: sellResult.executedPrice,
          amount: holding.quantity * sellResult.executedPrice,
          description: `Tax loss harvesting - realized loss: ${opportunity.unrealizedLoss.toFixed(2)}`,
          portfolio,
        });
        
        // If replacement specified, buy the replacement asset
        if (replacementSymbol) {
          const replacementAmount = holding.quantity * sellResult.executedPrice * 0.99; // Account for fees
          
          const buyResult = await this.tradingExecutionService.executeTrade({
            portfolioId,
            symbol: replacementSymbol,
            action: 'buy',
            amount: replacementAmount,
            orderType: 'market',
          });
          
          if (buyResult.success) {
            await this.transactionRepository.save({
              type: TransactionType.BUY,
              symbol: replacementSymbol,
              quantity: buyResult.executedQuantity,
              price: buyResult.executedPrice,
              amount: replacementAmount,
              description: `Tax loss harvesting replacement for ${holding.symbol}`,
              portfolio,
            });
          }
        }
        
        // Update portfolio values
        await this.portfolioService.updatePortfolioValue(portfolioId);
      }
    } catch (error) {
      console.error('Tax loss harvesting execution failed:', error);
      throw error;
    }
  }

  async getTaxLossHarvestingHistory(portfolioId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        portfolio: { id: portfolioId },
        type: TransactionType.TAX_LOSS_HARVEST,
      },
      order: { executedAt: 'DESC' },
    });
  }

  async calculatePotentialTaxSavings(portfolioId: string): Promise<{
    totalUnrealizedLosses: number;
    potentialTaxSavings: number;
    opportunities: number;
  }> {
    const opportunities = await this.identifyTaxLossOpportunities(portfolioId);
    const totalUnrealizedLosses = opportunities.reduce((sum, opp) => sum + opp.unrealizedLoss, 0);
    
    // Assume 25% tax rate for capital gains
    const potentialTaxSavings = totalUnrealizedLosses * 0.25;
    
    return {
      totalUnrealizedLosses,
      potentialTaxSavings,
      opportunities: opportunities.length,
    };
  }
}