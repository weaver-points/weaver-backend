import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceTrackingService } from '../../../src/portfolio-management/services/performance-tracking.service';
import { PerformanceMetric } from '../../../src/portfolio-management/entities/performance-metric.entity';
import { PortfolioService } from '../../../src/portfolio-management/services/portfolio.service';
import { MarketDataService } from '../../../src/portfolio-management/services/market-data.service';

describe('PerformanceTrackingService', () => {
  let service: PerformanceTrackingService;
  let performanceMetricRepository: Repository<PerformanceMetric>;
  let portfolioService: PortfolioService;
  let marketDataService: MarketDataService;

  const mockPortfolio = {
    id: '1',
    totalValue: 10000,
  };

  const mockHoldings = [
    {
      symbol: 'AAPL',
      marketValue: 6000,
    },
    {
      symbol: 'BND',
      marketValue: 4000,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceTrackingService,
        {
          provide: getRepositoryToken(PerformanceMetric),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: PortfolioService,
          useValue: {
            getPortfolioById: jest.fn(),
            getPortfolioHoldings: jest.fn(),
          },
        },
        {
          provide: MarketDataService,
          useValue: {
            getHistoricalPrices: jest.fn(),
            getHistoricalReturns: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PerformanceTrackingService>(PerformanceTrackingService);
    performanceMetricRepository = module.get<Repository<PerformanceMetric>>(getRepositoryToken(PerformanceMetric));
    portfolioService = module.get<PortfolioService>(PortfolioService);
    marketDataService = module.get<MarketDataService>(MarketDataService);
  });

  describe('calculatePerformanceMetrics', () => {
    it('should calculate comprehensive performance metrics', async () => {
      const mockPerformanceMetric = {
        portfolioId: '1',
        totalReturn: 800,
        totalReturnPercentage: 8,
        annualizedReturn: 0.08,
        volatility: 15,
        sharpeRatio: 1.2,
        maxDrawdown: 5,
        beta: 0.9,
        alpha: 0.02,
      };

      jest.spyOn(portfolioService, 'getPortfolioById').mockResolvedValue(mockPortfolio as any);
      jest.spyOn(portfolioService, 'getPortfolioHoldings').mockResolvedValue(mockHoldings as any);
      jest.spyOn(marketDataService, 'getHistoricalPrices').mockResolvedValue([175, 170, 165, 160]);
      jest.spyOn(marketDataService, 'getHistoricalReturns').mockResolvedValue([0.01, -0.02, 0.015, -0.01]);
      jest.spyOn(performanceMetricRepository, 'create').mockReturnValue(mockPerformanceMetric as any);
      jest.spyOn(performanceMetricRepository, 'save').mockResolvedValue(mockPerformanceMetric as any);

      const result = await service.calculatePerformanceMetrics('1', '1Y');

      expect(result).toEqual(mockPerformanceMetric);
      expect(performanceMetricRepository.create).toHaveBeenCalled();
      expect(performanceMetricRepository.save).toHaveBeenCalled();
    });
  });

  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const annualizedReturn = 0.08; // 8%
      const volatility = 15; // 15%
      
      const result = service['calculateSharpeRatio'](annualizedReturn, volatility);
      
      // (8% - 2% risk-free) / 15% = 0.4
      expect(result).toBeCloseTo(0.4, 2);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should calculate maximum drawdown correctly', () => {
      const returns = [0.05, -0.10, -0.05, 0.15, -0.08];
      
      const result = service['calculateMaxDrawdown'](returns);
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateBeta', () => {
    it('should calculate beta correctly', () => {
      const portfolioReturns = [0.02, -0.01, 0.03, -0.02];
      const benchmarkReturns = [0.015, -0.008, 0.025, -0.015];
      
      const result = service['calculateBeta'](portfolioReturns, benchmarkReturns);
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(3); // Reasonable beta range
    });
  });

  describe('getOptimizationSuggestions', () => {
    it('should provide optimization suggestions based on performance', async () => {
      const mockPerformance = {
        sharpeRatio: 0.5,
        volatility: 25,
        alpha: -3,
      };

      jest.spyOn(portfolioService, 'getPortfolioById').mockResolvedValue(mockPortfolio as any);
      jest.spyOn(service, 'calculatePerformanceMetrics').mockResolvedValue(mockPerformance as any);

      const result = await service.getOptimizationSuggestions('1');

      expect(result.suggestions).toHaveLength(3); // Low Sharpe, high volatility, poor alpha
      expect(result.suggestions[0].type).toBe('risk_adjustment');
      expect(result.suggestions[1].type).toBe('volatility_reduction');
      expect(result.suggestions[2].type).toBe('performance_improvement');
    });
  });
});