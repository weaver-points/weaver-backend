import { Test, TestingModule } from '@nestjs/testing';
import { SentimentAnalysisController } from '../sentiment-analysis.controller';
import { SentimentAnalysisService } from '../sentiment-analysis.service';
import { MLIntegrationService } from '../ml-integration.service';
import { SentimentWebSocketGateway } from '../websocket.gateway';

describe('SentimentAnalysisController', () => {
  let controller: SentimentAnalysisController;
  let service: SentimentAnalysisService;
  let mlService: MLIntegrationService;
  let wsGateway: SentimentWebSocketGateway;

  const mockSentimentService = {
    getCurrentSentiment: jest.fn(),
    getHistoricalSentiment: jest.fn(),
    getMarketPredictions: jest.fn(),
    getActiveTradingSignals: jest.fn(),
    analyzeTwitterSentiment: jest.fn(),
    analyzeRedditSentiment: jest.fn(),
    analyzeNewsSentiment: jest.fn(),
    generateMarketPredictions: jest.fn(),
    generateTradingSignals: jest.fn(),
  };

  const mockMLService = {
    getMarketSentimentCorrelation: jest.fn(),
    getAnomalyDetection: jest.fn(),
    getTopicClustering: jest.fn(),
  };

  const mockWSGateway = {
    broadcastSentimentUpdate: jest.fn(),
    broadcastTradingSignal: jest.fn(),
    broadcastMarketPrediction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SentimentAnalysisController],
      providers: [
        { provide: SentimentAnalysisService, useValue: mockSentimentService },
        { provide: MLIntegrationService, useValue: mockMLService },
        { provide: SentimentWebSocketGateway, useValue: mockWSGateway },
      ],
    }).compile();

    controller = module.get<SentimentAnalysisController>(SentimentAnalysisController);
    service = module.get<SentimentAnalysisService>(SentimentAnalysisService);
    mlService = module.get<MLIntegrationService>(MLIntegrationService);
    wsGateway = module.get<SentimentWebSocketGateway>(SentimentWebSocketGateway);
  });

  describe('getCurrentSentiment', () => {
    it('should return current sentiment for a symbol', async () => {
      const mockResult = {
        sentiment_score: 0.5,
        confidence: 0.8,
        breakdown: { social_impact: 0.4, news_impact: 0.6, overall_sentiment: 0.5 },
        last_updated: new Date(),
      };

      mockSentimentService.getCurrentSentiment.mockResolvedValue(mockResult);

      const result = await controller.getCurrentSentiment('btc');

      expect(service.getCurrentSentiment).toHaveBeenCalledWith('BTC');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getHistoricalSentiment', () => {
    it('should return historical sentiment data', async () => {
      const mockResult = [
        { date: '2024-01-01', sentiment: 0.5 },
        { date: '2024-01-02', sentiment: 0.3 },
      ];

      mockSentimentService.getHistoricalSentiment.mockResolvedValue(mockResult);

      const result = await controller.getHistoricalSentiment('btc', 7);

      expect(service.getHistoricalSentiment).toHaveBeenCalledWith('BTC', 7);
      expect(result).toEqual(mockResult);
    });

    it('should use default days parameter', async () => {
      mockSentimentService.getHistoricalSentiment.mockResolvedValue([]);

      await controller.getHistoricalSentiment('btc');

      expect(service.getHistoricalSentiment).toHaveBeenCalledWith('BTC', 7);
    });
  });

  describe('getMarketPredictions', () => {
    it('should return market predictions', async () => {
      const mockPredictions = [
        {
          symbol: 'BTC',
          prediction: 'bullish',
          confidence: 0.8,
          timeframe: '1d',
          sentiment_score: 0.6,
          factors: ['Positive sentiment'],
          created_at: new Date(),
        },
      ];

      mockSentimentService.getMarketPredictions.mockResolvedValue(mockPredictions);

      const result = await controller.getMarketPredictions();

      expect(service.getMarketPredictions).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockPredictions);
    });

    it('should filter by symbol when provided', async () => {
      mockSentimentService.getMarketPredictions.mockResolvedValue([]);

      await controller.getMarketPredictions('btc');

      expect(service.getMarketPredictions).toHaveBeenCalledWith('BTC');
    });
  });

  describe('triggerAnalysis', () => {
    it('should trigger manual analysis and return summary', async () => {
      const symbols = ['BTC', 'ETH'];
      
      mockSentimentService.analyzeTwitterSentiment.mockResolvedValue([{ id: '1' }]);
      mockSentimentService.analyzeRedditSentiment.mockResolvedValue([{ id: '2' }]);
      mockSentimentService.analyzeNewsSentiment.mockResolvedValue([{ id: '3' }]);
      mockSentimentService.generateMarketPredictions.mockResolvedValue([]);
      mockSentimentService.generateTradingSignals.mockResolvedValue([{ id: 'signal1' }]);

      const result = await controller.triggerAnalysis({ symbols });

      expect(result.analyzed_symbols).toEqual(['BTC', 'ETH']);
      expect(result.data_points).toBe(3);
      expect(result.signals_generated).toBe(1);
    });
  });
});