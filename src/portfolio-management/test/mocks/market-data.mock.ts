export const mockMarketDataService = {
  getCurrentPrice: jest.fn().mockImplementation((symbol: string) => {
    const prices = {
      'AAPL': 175.50,
      'GOOGL': 2800.00,
      'MSFT': 350.25,
      'BND': 85.25,
      'VNQ': 95.00,
      'SPY': 445.20,
    };
    return Promise.resolve(prices[symbol] || 100);
  }),

  getHistoricalPrices: jest.fn().mockImplementation((symbol: string, days: number) => {
    const currentPrice = 175.50;
    const prices = [];
    for (let i = 0; i < days; i++) {
      const randomChange = (Math.random() - 0.5) * 0.04;
      const price = currentPrice * (1 + randomChange * (days - i) / days);
      prices.push(price);
    }
    return Promise.resolve(prices);
  }),

  getHistoricalReturns: jest.fn().mockImplementation((symbol: string, days: number) => {
    const returns = [];
    for (let i = 0; i < days; i++) {
      returns.push((Math.random() - 0.5) * 0.04); // ±2% daily return
    }
    return Promise.resolve(returns);
  }),

  getAssetSector: jest.fn().mockImplementation((symbol: string) => {
    const sectors = {
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'MSFT': 'Technology',
      'BND': 'Bonds',
      'VNQ': 'Real Estate',
    };
    return Promise.resolve(sectors[symbol] || 'Unknown');
  }),

  getMarketData: jest.fn().mockImplementation((symbols: string[]) => {
    const marketData = {};
    symbols.forEach(symbol => {
      marketData[symbol] = {
        price: 100 + Math.random() * 200,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 10000000),
        sector: 'Technology',
      };
    });
    return Promise.resolve(marketData);
  }),
};