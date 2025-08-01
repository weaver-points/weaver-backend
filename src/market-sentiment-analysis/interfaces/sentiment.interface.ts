export interface SentimentData {
  id: string;
  source: 'twitter' | 'reddit' | 'discord' | 'news';
  content: string;
  sentiment: number; // -1 to 1
  confidence: number; // 0 to 1
  timestamp: Date;
  author?: string;
  engagement?: number;
  symbol?: string;
  impact_score?: number;
}

export interface MarketPrediction {
  symbol: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  timeframe: '1h' | '4h' | '1d' | '1w';
  sentiment_score: number;
  factors: string[];
  created_at: Date;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  strength: number; // 0 to 1
  sentiment_score: number;
  news_impact: number;
  social_impact: number;
  created_at: Date;
  expires_at: Date;
}

export interface SentimentAnalysisConfig {
  twitter: {
    bearer_token: string;
    enabled: boolean;
  };
  reddit: {
    client_id: string;
    client_secret: string;
    enabled: boolean;
  };
  discord: {
    bot_token: string;
    enabled: boolean;
  };
  news: {
    api_keys: string[];
    enabled: boolean;
  };
  ml_service_url: string;
}
