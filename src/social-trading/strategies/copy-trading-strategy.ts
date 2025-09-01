import { Injectable } from '@nestjs/common';
import {
  CopyTradingService,
  TradeSignal,
} from '../services/copy-trading.service';

export interface StrategyConfig {
  name: string;
  maxPositions: number;
  riskPerTrade: number;
  stopLoss: number;
  takeProfit: number;
  timeframes: string[];
  instruments: string[];
}

@Injectable()
export class CopyTradingStrategy {
  constructor(private copyTradingService: CopyTradingService) {}

  async processSignal(
    signal: TradeSignal,
    config: StrategyConfig,
  ): Promise<void> {
    // Validate signal against strategy rules
    if (!this.validateSignal(signal, config)) {
      return;
    }

    // Apply strategy filters
    const filteredSignal = this.applyFilters(signal, config);

    // Execute copy trades
    await this.copyTradingService.processTradeSignal(filteredSignal);
  }

  private validateSignal(signal: TradeSignal, config: StrategyConfig): boolean {
    // Check if instrument is allowed
    if (!config.instruments.includes(signal.instrument)) {
      return false;
    }

    // Check position limits
    // In real implementation, would check current positions

    return true;
  }

  private applyFilters(
    signal: TradeSignal,
    config: StrategyConfig,
  ): TradeSignal {
    // Apply strategy-specific filters
    const filteredSignal = { ...signal };

    // Apply stop loss and take profit from strategy config
    if (!filteredSignal.stopLoss && config.stopLoss) {
      filteredSignal.stopLoss = signal.price * (1 - config.stopLoss / 100);
    }

    if (!filteredSignal.takeProfit && config.takeProfit) {
      filteredSignal.takeProfit = signal.price * (1 + config.takeProfit / 100);
    }

    return filteredSignal;
  }
}
