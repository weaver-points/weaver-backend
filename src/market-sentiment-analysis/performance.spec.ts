import { Test, TestingModule } from '@nestjs/testing';
import { SentimentAnalysisService } from '../sentiment-analysis.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  let service: SentimentAnalysisService;

  const mockRepositories = {
    save: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentAnalysisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => ({
              twitter: { enabled: false },
              reddit: { enabled: false },
              news: { enabled: false },
            })),
          },
        },
        {
          provide: HttpService,
          useValue: { get: jest.fn(), post: jest.fn() },
        },
        {
          provide: getRepositoryToken('SentimentDataEntity'),
          useValue: mockRepositories,
        },
        {
          provide: getRepositoryToken('MarketPredictionEntity'),
          useValue: mockRepositories,
        },
        {
          provide: getRepositoryToken('TradingSignalEntity'),
          useValue: mockRepositories,
        },
      ],
    }).compile();

    service = module.get<SentimentAnalysisService>(SentimentAnalysisService);
  });

  describe('Sentiment Analysis Performance', () => {
    it('should analyze sentiment within 50ms', () => {
      const text = 'Bitcoin is amazing and will go to the moon! 🚀';
      
      const start = performance.now();
      const result = service['analyzeSentiment'](text);
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('confidence');
    });

    it('should handle batch sentiment analysis efficiently', () => {
      const texts = Array(100).fill(0).map((_, i) => 
        `Test sentiment analysis text number ${i} with Bitcoin and Ethereum mentions`
      );

      const start = performance.now();
      
      texts.forEach(text => {
        service['analyzeSentiment'](text);
      });

      const end = performance.now();
      const avgTime = (end - start) / texts.length;

      expect(avgTime).toBeLessThan(10); // Average less than 10ms per analysis
    });
  });

  describe('Weight Calculation Performance', () => {
    it('should calculate weighted sentiment efficiently for large datasets', () => {
      const sentiments = Array(1000).fill(0).map((_, i) => ({
        sentiment: Math.random() * 2 - 1, // -1 to 1
        confidence: Math.random(),
        timestamp: new Date(Date.now() - i * 60000), // 1 minute intervals
        engagement: Math.floor(Math.random() * 1000),
      }));

      const start = performance.now();
      const result = service['calculateWeightedSentiment'](sentiments as any);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    });
  });
});