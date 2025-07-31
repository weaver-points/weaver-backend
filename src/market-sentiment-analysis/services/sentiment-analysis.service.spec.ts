import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import { SentimentAnalysisService } from '../sentiment-analysis.service';
import { SentimentDataEntity, MarketPredictionEntity, TradingSignalEntity } from '../entities';
import { SentimentData, MarketPrediction, TradingSignal } from '../interfaces';

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;
  let configService: ConfigService;
  let httpService: HttpService;
  let sentimentRepo: Repository<SentimentDataEntity>;
  let predictionRepo: Repository<MarketPredictionEntity>;
  let signalRepo: Repository<TradingSignalEntity>;

  const mockConfig = {
    sentiment: {
      twitter: {
        bearer_token: 'test_token',
        enabled: true,
      },
      reddit: {
        client_id: 'test_client',
        client_secret: 'test_secret',
        enabled: true,
      },
      news: {
        api_keys: ['test_key_1', 'test_key_2'],
        enabled: true,
      },
      ml_service_url: 'http://localhost:8000',
    },
  };

  const mockSentimentData: SentimentData[] = [
    {
      id: '1',
      source: 'twitter',
      content: 'Bitcoin is going to the moon! 🚀',
      sentiment: 0.8,
      confidence: 0.9,
      timestamp: new Date(),
      author: 'crypto_trader',
      engagement: 150,
      symbol: 'BTC',
      impact_score: 0.7,
    },
    {
      id: '2',
      source: 'twitter',
      content: 'Bitcoin crash incoming, sell everything!',
      sentiment: -0.7,
      confidence: 0.85,
      timestamp: new Date(),
      author: 'bear_trader',
      engagement: 80,
      symbol: 'BTC',
      impact_score: 0.6,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentAnalysisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'sentiment') return mockConfig.sentiment;
              if (key === 'watchedSymbols') return ['BTC', 'ETH', 'AAPL'];
              return null;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SentimentDataEntity),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MarketPredictionEntity),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TradingSignalEntity),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SentimentAnalysisService>(SentimentAnalysisService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
    sentimentRepo = module.get<Repository<SentimentDataEntity>>(getRepositoryToken(SentimentDataEntity));
    predictionRepo = module.get<Repository<MarketPredictionEntity>>(getRepositoryToken(MarketPredictionEntity));
    signalRepo = module.get<Repository<TradingSignalEntity>>(getRepositoryToken(TradingSignalEntity));
  });

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment correctly', () => {
      const text = 'Bitcoin is amazing and going to the moon!';
      const result = service['analyzeSentiment'](text);
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should analyze negative sentiment correctly', () => {
      const text = 'Bitcoin is terrible and will crash soon!';
      const result = service['analyzeSentiment'](text);
      
      expect(result.score).toBeLessThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle neutral sentiment', () => {
      const text = 'Bitcoin is a cryptocurrency.';
      const result = service['analyzeSentiment'](text);
      
      expect(Math.abs(result.score)).toBeLessThan(0.3);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('analyzeTwitterSentiment', () => {
    it('should successfully analyze Twitter sentiment', async () => {
      const mockTwitterResponse = {
        data: {
          data: [
            {
              id: '123',
              text: 'Bitcoin is going up! 🚀',
              created_at: '2024-01-01T00:00:00.000Z',
              author_id: 'user123',
              public_metrics: {
                like_count: 10,
                retweet_count: 5,
                reply_count: 2,
              },
            },
          ],
        },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockTwitterResponse));
      jest.spyOn(sentimentRepo, 'save').mockResolvedValue({} as any);

      const result = await service.analyzeTwitterSentiment(['BTC']);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('twitter');
      expect(result[0].symbol).toBe('BTC');
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.twitter.com/2/tweets/search/recent',
        expect.any(Object)
      );
      expect(sentimentRepo.save).toHaveBeenCalled();
    });

    it('should handle Twitter API errors gracefully', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('API Error')));

      const result = await service.analyzeTwitterSentiment(['BTC']);

      expect(result).toHaveLength(0);
    });

    it('should skip when Twitter is disabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        ...mockConfig.sentiment,
        twitter: { ...mockConfig.sentiment.twitter, enabled: false },
      });

      const result = await service.analyzeTwitterSentiment(['BTC']);

      expect(result).toHaveLength(0);
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });

  describe('analyzeRedditSentiment', () => {
    it('should successfully analyze Reddit sentiment', async () => {
      const mockAuthResponse = { data: { access_token: 'test_token' } };
      const mockRedditResponse = {
        data: {
          data: {
            children: [
              {
                data: {
                  id: 'reddit123',
                  title: 'Bitcoin discussion',
                  selftext: 'What do you think about BTC?',
                  created_utc: 1640995200,
                  author: 'reddit_user',
                  score: 50,
                  num_comments: 10,
                },
              },
            ],
          },
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockAuthResponse));
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockRedditResponse));
      jest.spyOn(sentimentRepo, 'save').mockResolvedValue({} as any);

      const result = await service.analyzeRedditSentiment(['BTC']);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('reddit');
      expect(result[0].symbol).toBe('BTC');
    });
  });

  describe('generateMarketPredictions', () => {
    it('should generate market predictions based on sentiment data', async () => {
      jest.spyOn(sentimentRepo, 'find').mockResolvedValue(mockSentimentData as any);
      jest.spyOn(predictionRepo, 'save').mockResolvedValue({} as any);

      const result = await service.generateMarketPredictions(['BTC']);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].symbol).toBe('BTC');
      expect(['bullish', 'bearish', 'neutral']).toContain(result[0].prediction);
      expect(predictionRepo.save).toHaveBeenCalled();
    });

    it('should skip symbols with no sentiment data', async () => {
      jest.spyOn(sentimentRepo, 'find').mockResolvedValue([]);

      const result = await service.generateMarketPredictions(['BTC']);

      expect(result).toHaveLength(0);
    });
  });

  describe('generateTradingSignals', () => {
    const mockPredictions: MarketPrediction[] = [
      {
        symbol: 'BTC',
        prediction: 'bullish',
        confidence: 0.8,
        timeframe: '1d',
        sentiment_score: 0.6,
        factors: ['Positive sentiment trend'],
        created_at: new Date(),
      },
    ];

    it('should generate trading signals from predictions', async () => {
      jest.spyOn(predictionRepo, 'find').mockResolvedValue(mockPredictions as any);
      jest.spyOn(service, 'getSentimentBreakdown' as any).mockResolvedValue({
        social_impact: 0.5,
        news_impact: 0.4,
        overall_sentiment: 0.6,
      });
      jest.spyOn(signalRepo, 'save').mockResolvedValue({} as any);

      const result = await service.generateTradingSignals(['BTC']);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].symbol).toBe('BTC');
      expect(['buy', 'sell', 'hold']).toContain(result[0].action);
    });
  });

  describe('getCurrentSentiment', () => {
    it('should return current sentiment for a symbol', async () => {
      jest.spyOn(service, 'getSentimentBreakdown' as any).mockResolvedValue({
        social_impact: 0.5,
        news_impact: 0.4,
        overall_sentiment: 0.6,
      });

      const result = await service.getCurrentSentiment('BTC');

      expect(result.sentiment_score).toBe(0.6);
      expect(result.confidence).toBe(0.6);
      expect(result.breakdown).toBeDefined();
      expect(result.last_updated).toBeInstanceOf(Date);
    });
  });

  describe('getHistoricalSentiment', () => {
    it('should return historical sentiment data', async () => {
      const mockHistoricalData = [
        { date: '2024-01-01', sentiment: '0.5' },
        { date: '2024-01-02', sentiment: '0.3' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockHistoricalData),
      };

      jest.spyOn(sentimentRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getHistoricalSentiment('BTC', 7);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].sentiment).toBe(0.5);
    });
  });
});
