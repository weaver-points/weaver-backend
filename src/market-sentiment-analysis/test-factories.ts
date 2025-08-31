export class TestDataFactory {
  static createSentimentData(
    overrides: Partial<SentimentData> = {},
  ): SentimentData {
    return {
      id: Math.random().toString(36).substring(7),
      source: 'twitter',
      content: 'Test sentiment content about Bitcoin',
      sentiment: Math.random() * 2 - 1, // -1 to 1
      confidence: Math.random(),
      timestamp: new Date(),
      author: 'test_user',
      engagement: Math.floor(Math.random() * 1000),
      symbol: 'BTC',
      impact_score: Math.random(),
      ...overrides,
    };
  }

  static createMarketPrediction(
    overrides: Partial<MarketPrediction> = {},
  ): MarketPrediction {
    const predictions = ['bullish', 'bearish', 'neutral'] as const;
    const timeframes = ['1h', '4h', '1d', '1w'] as const;

    return {
      symbol: 'BTC',
      prediction: predictions[Math.floor(Math.random() * predictions.length)],
      confidence: Math.random(),
      timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
      sentiment_score: Math.random() * 2 - 1,
      factors: ['Test factor 1', 'Test factor 2'],
      created_at: new Date(),
      ...overrides,
    };
  }

  static createTradingSignal(
    overrides: Partial<TradingSignal> = {},
  ): TradingSignal {
    const actions = ['buy', 'sell', 'hold'] as const;

    return {
      id: Math.random().toString(36).substring(7),
      symbol: 'BTC',
      action: actions[Math.floor(Math.random() * actions.length)],
      strength: Math.random(),
      sentiment_score: Math.random() * 2 - 1,
      news_impact: Math.random(),
      social_impact: Math.random(),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      ...overrides,
    };
  }

  static createBulkSentimentData(
    count: number,
    symbol: string = 'BTC',
  ): SentimentData[] {
    return Array(count)
      .fill(0)
      .map(() => this.createSentimentData({ symbol }));
  }
}
