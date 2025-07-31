import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MarketDataService {
  constructor(private httpService: HttpService) {}

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // In production, integrate with real market data providers like Alpha Vantage, IEX, etc.
      // For demo purposes, return mock data
      const mockPrices = {
        'AAPL': 175.50,
        'GOOGL': 2800.00,
        'MSFT': 350.25,
        'TSLA': 250.75,
        'SPY': 445.20,
        'QQQ': 380.15,
        'VTI': 230.50,
        'BND': 85.25,
      };
      
      return mockPrices[symbol] || 100 + Math.random() * 200; // Random price between 100-300
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);
      return 100; // Fallback price
    }
  }

  async getHistoricalPrices(symbol: string, days: number): Promise<number[]> {
    // Mock historical prices - in production, use real API
    const currentPrice = await this.getCurrentPrice(symbol);
    const prices = [];
    
    for (let i = 0; i < days; i++) {
      const randomChange = (Math.random() - 0.5) * 0.04; // ±2% daily change
      const price = currentPrice * (1 + randomChange * (days - i) / days);
      prices.push(price);
    }
    
    return prices;
  }

  async getHistoricalReturns(symbol: string, days: number): Promise<number[]> {
    const prices = await this.getHistoricalPrices(symbol, days + 1);
    const returns = [];
    
    for (let i = 0; i < prices.length - 1; i++) {
      const dailyReturn = (prices[i] - prices[i + 1]) / prices[i + 1];
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  async getAssetSector(symbol: string): Promise<string> {
    // Mock sector data - in production, use real API
    const sectorMap = {
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'MSFT': 'Technology',
      'TSLA': 'Consumer Discretionary',
      'SPY': 'Diversified',
      'QQQ': 'Technology',
      'VTI': 'Diversified',
      'BND': 'Bonds',
    };
    
    return sectorMap[symbol] || 'Unknown';
  }

  async getMarketData(symbols: string[]): Promise<Record<string, any>> {
    const marketData = {};
    
    for (const symbol of symbols) {
      marketData[symbol] = {
        price: await this.getCurrentPrice(symbol),
        change: (Math.random() - 0.5) * 10, // Random daily change
        changePercent: (Math.random() - 0.5) * 5, // Random daily change %
        volume: Math.floor(Math.random() * 10000000), // Random volume
        sector: await this.getAssetSector(symbol),
      };
    }
    
    return marketData;
  }
}
