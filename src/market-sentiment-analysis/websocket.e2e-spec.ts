import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { io, Socket } from 'socket.io-client';
import { CompleteSentimentAnalysisModule } from '../sentiment-analysis.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentimentDataEntity, MarketPredictionEntity, TradingSignalEntity } from '../entities';

describe('WebSocket Gateway (e2e)', () => {
  let app: INestApplication;
  let client: Socket;

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
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [SentimentDataEntity, MarketPredictionEntity, TradingSignalEntity],
          synchronize: true,
        }),
        CompleteSentimentAnalysisModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.listen(3001);
  });

  afterAll(async () => {
    if (client) {
      client.close();
    }
    await app.close();
  });

  beforeEach((done) => {
    client = io('http://localhost:3001/sentiment', {
      transports: ['websocket'],
    });
    client.on('connect', done);
  });

  afterEach(() => {
    if (client) {
      client.close();
    }
  });

  it('should connect to websocket', (done) => {
    client.on('connect', () => {
      expect(client.connected).toBe(true);
      done();
    });
  });

  it('should subscribe to symbol updates', (done) => {
    client.emit('subscribe', { symbols: ['BTC', 'ETH'] });
    
    client.on('subscribed', (data) => {
      expect(data.symbols).toContain('BTC');
      expect(data.symbols).toContain('ETH');
      expect(data.message).toContain('Successfully subscribed');
      done();
    });
  });

  it('should unsubscribe from symbol updates', (done) => {
    client.emit('subscribe', { symbols: ['BTC', 'ETH', 'AAPL'] });
    
    client.on('subscribed', () => {
      client.emit('unsubscribe', { symbols: ['BTC', 'ETH'] });
    });

    client.on('unsubscribed', (data) => {
      expect(data.symbols).toContain('BTC');
      expect(data.symbols).toContain('ETH');
      expect(data.remaining).toContain('AAPL');
      done();
    });
  });

  it('should receive sentiment updates', (done) => {
    client.emit('subscribe', { symbols: ['BTC'] });
    
    client.on('subscribed', () => {
      // Simulate sentiment update broadcast
      setTimeout(() => {
        client.on('sentiment_update', (data) => {
          expect(data.symbol).toBe('BTC');
          expect(data).toHaveProperty('timestamp');
          done();
        });
      }, 100);
    });
  });
});
