import { Injectable } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

interface TradeOrder {
  portfolioId: string;
  symbol: string;
  action: 'buy' | 'sell';
  quantity?: number;
  amount?: number;
  orderType: 'market' | 'limit' | 'stop';
  limitPrice?: number;
}

interface TradeResult {
  success: boolean;
  orderId: string;
  executedPrice: number;
  executedQuantity: number;
  fees: number;
  message: string;
}

@Injectable()
export class TradingExecutionService {
  constructor(private marketDataService: MarketDataService) {}

  async executeTrade(order: TradeOrder): Promise<TradeResult> {
    try {
      // Simulate trade execution
      const currentPrice = await this.marketDataService.getCurrentPrice(order.symbol);
      
      let executedPrice = currentPrice;
      let executedQuantity = order.quantity || 0;
      
      // If buying with amount instead of quantity
      if (order.amount && !order.quantity) {
        executedQuantity = order.amount / currentPrice;
      }
      
      // Simulate market impact and slippage
      const slippage = this.calculateSlippage(order.action, executedQuantity);
      executedPrice = currentPrice * (1 + slippage);
      
      // Calculate fees (0.1% of trade value)
      const tradeValue = executedPrice * executedQuantity;
      const fees = tradeValue * 0.001;
      
      // Simulate order processing delay
      await this.delay(100);
      
      return {
        success: true,
        orderId: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        executedPrice,
        executedQuantity,
        fees,
        message: `${order.action.toUpperCase()} order executed successfully`,
      };
      
    } catch (error) {
      return {
        success: false,
        orderId: '',
        executedPrice: 0,
        executedQuantity: 0,
        fees: 0,
        message: `Trade execution failed: ${error.message}`,
      };
    }
  }

  private calculateSlippage(action: string, quantity: number): number {
    // Simulate market impact - larger orders have more slippage
    const baseSlippage = 0.001; // 0.1% base slippage
    const impactFactor = Math.min(quantity / 10000, 0.01); // Up to 1% additional impact
    
    const slippage = baseSlippage + impactFactor;
    return action === 'buy' ? slippage : -slippage;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getOrderStatus(orderId: string): Promise<any> {
    // Mock order status
    return {
      orderId,
      status: 'filled',
      executedAt: new Date(),
      message: 'Order completed successfully',
    };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    // Mock order cancellation
    return true;
  }
}