import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { MLIntegrationService } from '../ml-integration.service';

describe('MLIntegrationService', () => {
  let service: MLIntegrationService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfig = {
    sentiment: {
      ml_service_url: 'http://localhost:8000',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MLIntegrationService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'sentiment') return mockConfig.sentiment;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MLIntegrationService>(MLIntegrationService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('getMarketSentimentCorrelation', () => {
    it('should return correlation analysis', async () => {
      const mockResponse = {
        data: {
          correlation: 0.65,
          confidence: 0.8,
          analysis: 'Strong positive correlation detected',
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.getMarketSentimentCorrelation('BTC', 30);

      expect(result.correlation).toBe(0.65);
      expect(result.confidence).toBe(0.8);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/market_correlation',
        {
          symbol: 'BTC',
          days: 30,
          features: ['sentiment', 'volume', 'price_change', 'social_volume'],
        }
      );
    });

    it('should handle ML service errors gracefully', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('ML Service Error')));

      const result = await service.getMarketSentimentCorrelation('BTC', 30);

      expect(result.correlation).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.analysis).toBe('Analysis unavailable');
    });
  });

  describe('getAnomalyDetection', () => {
    it('should detect sentiment anomalies', async () => {
      const mockResponse = {
        data: {
          is_anomaly: true,
          anomaly_score: 0.85,
          factors: ['Unusual spike in negative sentiment', 'High volume of mentions'],
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.getAnomalyDetection('BTC');

      expect(result.is_anomaly).toBe(true);
      expect(result.anomaly_score).toBe(0.85);
      expect(result.factors).toHaveLength(2);
    });
  });

  describe('getTopicClustering', () => {
    it('should return topic clusters with sentiment', async () => {
      const mockResponse = {
        data: {
          topics: [
            {
              topic: 'Price Movement',
              sentiment: 0.3,
              frequency: 45,
              keywords: ['bull', 'moon', 'pump', 'rally'],
            },
            {
              topic: 'Technical Analysis',
              sentiment: -0.1,
              frequency: 30,
              keywords: ['support', 'resistance', 'chart', 'pattern'],
            },
          ],
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.getTopicClustering('BTC', 7);

      expect(result.topics).toHaveLength(2);
      expect(result.topics[0].topic).toBe('Price Movement');
      expect(result.topics[0].sentiment).toBe(0.3);
    });
  });
});