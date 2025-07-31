import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SentimentDataEntity, MarketPredictionEntity, TradingSignalEntity } from '../entities';

export class TestUtils {
  static async createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            () => ({
              sentiment: {
                twitter: { bearer_token: 'test_token', enabled: false },
                reddit: { client_id: 'test_id', client_secret: 'test_secret', enabled: false },
                discord: { bot_token: 'test_token', enabled: false },
                news: { api_keys: ['test_key'], enabled: false },
                ml_service_url: 'http://localhost:8000',
              },
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [SentimentDataEntity, MarketPredictionEntity, TradingSignalEntity],
          synchronize: true,
          logging: false,
        }),
      ],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();
    return app;
  }

  static async seedDatabase(app: INestApplication, data: {
    sentiments?: SentimentData[];
    predictions?: MarketPrediction[];
    signals?: TradingSignal[];
  }) {
    // Implementation for seeding test database
    // This would use the repositories to insert test data
  }

  static expectValidSentimentData(data: any) {
    expect(data).toHaveProperty('sentiment_score');
    expect(data).toHaveProperty('confidence');
    expect(data).toHaveProperty('breakdown');
    expect(data).toHaveProperty('last_updated');
    expect(typeof data.sentiment_score).toBe('number');
    expect(data.sentiment_score).toBeGreaterThanOrEqual(-1);
    expect(data.sentiment_score).toBeLessThanOrEqual(1);
  }

  static expectValidPrediction(prediction: any) {
    expect(prediction).toHaveProperty('symbol');
    expect(prediction).toHaveProperty('prediction');
    expect(prediction).toHaveProperty('confidence');
    expect(prediction).toHaveProperty('timeframe');
    expect(['bullish', 'bearish', 'neutral']).toContain(prediction.prediction);
    expect(['1h', '4h', '1d', '1w']).toContain(prediction.timeframe);
  }

  static expectValidTradingSignal(signal: any) {
    expect(signal).toHaveProperty('symbol');
    expect(signal).toHaveProperty('action');
    expect(signal).toHaveProperty('strength');
    expect(['buy', 'sell', 'hold']).toContain(signal.action);
    expect(signal.strength).toBeGreaterThanOrEqual(0);
    expect(signal.strength).toBeLessThanOrEqual(1);
  }
}