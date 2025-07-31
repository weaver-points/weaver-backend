import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { SentimentAnalysisService } from '../sentiment-analysis.service';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('External API Integration Tests', () => {
  let service: SentimentAnalysisService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentAnalysisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => ({
              twitter: { bearer_token: 'test_token', enabled: true },
              reddit: { client_id: 'test_id', client_secret: 'test_secret', enabled: true },
              news: { api_keys: ['test_key'], enabled: true },
              ml_service_url: 'http://localhost:8000',
            })),
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
          provide: getRepositoryToken('SentimentDataEntity'),
          useValue: { save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken('MarketPredictionEntity'),
          useValue: { save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken('TradingSignalEntity'),
          useValue: { save: jest.fn(), find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SentimentAnalysisService>(SentimentAnalysisService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('Twitter API Integration', () => {
    it('should handle Twitter API rate limiting', async () => {
      const rateLimitResponse = {
        response: { status: 429 },
        message: 'Rate limit exceeded',
      };

      jest.spyOn(httpService, 'get').mockImplementation(() => {
        throw rateLimitResponse;
      });

      const result = await service.analyzeTwitterSentiment(['BTC']);
      expect(result).toHaveLength(0);
    });

    it('should handle Twitter API authentication errors', async () => {
      const authError = {
        response: { status: 401 },
        message: 'Unauthorized',
      };

      jest.spyOn(httpService, 'get').mockImplementation(() => {
        throw authError;
      });

      const result = await service.analyzeTwitterSentiment(['BTC']);
      expect(result).toHaveLength(0);
    });
  });

  describe('Reddit API Integration', () => {
    it('should handle Reddit API token refresh', async () => {
      const tokenResponse = { data: { access_token: 'new_token' } };
      const redditResponse = {
        data: {
          data: {
            children: [{
              data: {
                id: 'test_id',
                title: 'Test post',
                selftext: 'Test content',
                created_utc: 1640995200,
                author: 'test_user',
                score: 10,
                num_comments: 5,
              },
            }],
          },
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(tokenResponse));
      jest.spyOn(httpService, 'get').mockReturnValue(of(redditResponse));

      const result = await service.analyzeRedditSentiment(['BTC']);
      
      expect(httpService.post).toHaveBeenCalledWith(
        'https://www.reddit.com/api/v1/access_token',
        expect.any(String),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('News API Integration', () => {
    it('should rotate between API keys on failure', async () => {
      const newsResponse = {
        data: {
          articles: [{
            title: 'Bitcoin News',
            description: 'Bitcoin is trending',
            publishedAt: '2024-01-01T00:00:00Z',
            source: { name: 'Test Source' },
            url: 'https://example.com/news',
          }],
        },
      };

      // First call fails, second succeeds
      jest.spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ response: { status: 429 } } as any))
        .mockReturnValue(of(newsResponse));

      const result = await service.analyzeNewsSentiment(['BTC']);
      expect(result).toHaveLength(1);
    });
  });
});
