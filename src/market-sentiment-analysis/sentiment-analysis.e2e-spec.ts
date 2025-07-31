import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import * as request from 'supertest';
import { CompleteSentimentAnalysisModule } from '../sentiment-analysis.module';
import { SentimentDataEntity, MarketPredictionEntity, TradingSignalEntity } from '../entities';

describe('SentimentAnalysisController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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
              watchedSymbols: ['BTC', 'ETH'],
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [SentimentDataEntity, MarketPredictionEntity, TradingSignalEntity],
          synchronize: true,
        }),
        HttpModule,
        ScheduleModule.forRoot(),
        CompleteSentimentAnalysisModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/sentiment/current/:symbol (GET)', () => {
    it('should return current sentiment for a symbol', () => {
      return request(app.getHttpServer())
        .get('/sentiment/current/BTC')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('sentiment_score');
          expect(res.body).toHaveProperty('confidence');
          expect(res.body).toHaveProperty('breakdown');
          expect(res.body).toHaveProperty('last_updated');
        });
    });

    it('should handle lowercase symbols', () => {
      return request(app.getHttpServer())
        .get('/sentiment/current/btc')
        .expect(200);
    });
  });

  describe('/sentiment/historical/:symbol (GET)', () => {
    it('should return historical sentiment data', () => {
      return request(app.getHttpServer())
        .get('/sentiment/historical/BTC')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should accept days parameter', () => {
      return request(app.getHttpServer())
        .get('/sentiment/historical/BTC?days=14')
        .expect(200);
    });
  });

  describe('/sentiment/predictions (GET)', () => {
    it('should return market predictions', () => {
      return request(app.getHttpServer())
        .get('/sentiment/predictions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter by symbol', () => {
      return request(app.getHttpServer())
        .get('/sentiment/predictions?symbol=BTC')
        .expect(200);
    });
  });

  describe('/sentiment/signals (GET)', () => {
    it('should return active trading signals', () => {
      return request(app.getHttpServer())
        .get('/sentiment/signals')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/sentiment/analyze (POST)', () => {
    it('should trigger manual analysis', () => {
      return request(app.getHttpServer())
        .post('/sentiment/analyze')
        .send({ symbols: ['BTC', 'ETH'] })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('analyzed_symbols');
          expect(res.body).toHaveProperty('data_points');
          expect(res.body).toHaveProperty('signals_generated');
        });
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/sentiment/analyze')
        .send({})
        .expect(400);
    });
  });

  describe('/sentiment/correlation/:symbol (GET)', () => {
    it('should return correlation analysis', () => {
      return request(app.getHttpServer())
        .get('/sentiment/correlation/BTC')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('correlation');
          expect(res.body).toHaveProperty('confidence');
          expect(res.body).toHaveProperty('analysis');
        });
    });
  });

  describe('/sentiment/anomaly/:symbol (GET)', () => {
    it('should return anomaly detection results', () => {
      return request(app.getHttpServer())
        .get('/sentiment/anomaly/BTC')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('is_anomaly');
          expect(res.body).toHaveProperty('anomaly_score');
          expect(res.body).toHaveProperty('factors');
        });
    });
  });

  describe('/sentiment/topics/:symbol (GET)', () => {
    it('should return topic analysis', () => {
      return request(app.getHttpServer())
        .get('/sentiment/topics/BTC')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('topics');
          expect(Array.isArray(res.body.topics)).toBe(true);
        });
    });
  });
});