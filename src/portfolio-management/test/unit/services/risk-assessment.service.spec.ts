import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskAssessmentService } from '../../../src/portfolio-management/services/risk-assessment.service';
import { RiskMetric } from '../../../src/portfolio-management/entities/risk-metric.entity';
import { PortfolioService } from '../../../src/portfolio-management/services/portfolio.service';
import { MarketDataService } from '../../../src/portfolio-management/services/market-data.service';

describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let riskMetricRepository: Repository<RiskMetric>;
  let portfolioService: PortfolioService;
  let marketDataService: MarketDataService;

  const mockPortfolio = {
    id: '1',
    riskTolerance: 'MEDIUM',
  };

  const mockHoldings = [
    {
      symbol: 'AAPL',
      marketValue: 5000,
      assetClass: 'stocks',
    },
    {
      symbol: 'GOOGL',
      marketValue: 3000,
      assetClass: 'stocks',
    },
    {
      symbol: 'BND',
      marketValue: 2000,
      assetClass: 'bonds',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAssessmentService,
        {
          provide: getRepositoryToken(RiskMetric),
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
            getHistoricalReturns: jest.fn(),
            getAssetSector: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RiskAssessmentService>(RiskAssessmentService);
    riskMetricRepository = module.get<Repository<RiskMetric>>(getRepositoryToken(RiskMetric));
    portfolioService = module.get<PortfolioService>(PortfolioService);
    marketDataService = module.get<MarketDataService>(MarketDataService);
  });

  describe('assessPortfolioRisk', () => {
    it('should calculate comprehensive risk metrics', async () => {
      const mockRiskMetric = {
        portfolioId: '1',
        valueAtRisk: -500,
        conditionalVaR: -650,
        concentrationRisk: 35,
        correlationRisk: 60,
        sectorExposure: { Technology: 80, Bonds: 20 },
        geographicExposure: { US: 70, International: 30 },
        riskScore: 6,
      };

      jest.spyOn(portfolioService, 'getPortfolioById').mockResolvedValue(mockPortfolio as any);
      jest.spyOn(portfolioService, 'getPortfolioHoldings').mockResolvedValue(mockHoldings as any);
      jest.spyOn(marketDataService, 'getHistoricalReturns').mockResolvedValue([-0.02, 0.01, -0.015, 0.03]);
      jest.spyOn(marketDataService, 'getAssetSector').mockResolvedValue('Technology');
      jest.spyOn(riskMetricRepository, 'create').mockReturnValue(mockRiskMetric as any);
      jest.spyOn(riskMetricRepository, 'save').mockResolvedValue(mockRiskMetric as any);

      const result = await service.assessPortfolioRisk('1');

      expect(result).toEqual(mockRiskMetric);
      expect(riskMetricRepository.create).toHaveBeenCalled();
      expect(riskMetricRepository.save).toHaveBeenCalled();
    });
  });

  describe('calculateConcentrationRisk', () => {
    it('should calculate concentration risk using HHI', () => {
      const result = service['calculateConcentrationRisk'](mockHoldings);
      
      // Expected HHI: (0.5^2 + 0.3^2 + 0.2^2) * 100 = (0.25 + 0.09 + 0.04) * 100 = 38
      expect(result).toBeCloseTo(38, 0);
    });
  });

  describe('calculateSectorExposure', () => {
    it('should calculate sector exposure percentages', () => {
      const result = service['calculateSectorExposure'](mockHoldings);
      
      expect(result.stocks).toBeCloseTo(80, 0); // (5000 + 3000) / 10000 * 100
      expect(result.bonds).toBeCloseTo(20, 0); // 2000 / 10000 * 100
    });
  });

  describe('calculateOverallRiskScore', () => {
    it('should calculate overall risk score correctly', () => {
      const metrics = {
        concentrationRisk: 30,
        correlationRisk: 70,
        portfolio: { riskTolerance: 'HIGH' },
      };

      const result = service['calculateOverallRiskScore'](metrics);
      
      // Base: 5, +2 for high concentration, +2 for high correlation, +1 for high risk tolerance = 10
      expect(result).toBe(10);
    });

    it('should cap risk score at maximum of 10', () => {
      const metrics = {
        concentrationRisk: 50,
        correlationRisk: 90,
        portfolio: { riskTolerance: 'HIGH' },
      };

      const result = service['calculateOverallRiskScore'](metrics);
      expect(result).toBe(10);
    });
  });
});