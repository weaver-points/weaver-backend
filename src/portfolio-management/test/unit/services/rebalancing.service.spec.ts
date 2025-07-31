 { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RebalancingService } from '../../../src/portfolio-management/services/rebalancing.service';
import { Portfolio } from '../../../src/portfolio-management/entities/portfolio.entity';
import { Holding } from '../../../src/portfolio-management/entities/holding.entity';
import { RebalancingRule } from '../../../src/portfolio-management/entities/rebalancing-rule.entity';
import { Transaction } from '../../../src/portfolio-management/entities/transaction.entity';
import { PortfolioService } from '../../../src/portfolio-management/services/portfolio.service';
import { TradingExecutionService } from '../../../src/portfolio-management/services/trading-execution.service';

describe('RebalancingService', () => {
  let service: RebalancingService;
  let portfolioRepository: Repository<Portfolio>;
  let portfolioService: PortfolioService;
  let tradingExecutionService: TradingExecutionService;

  const mockPortfolio = {
    id: '1',
    totalValue: 10000,
    targetAllocation: { stocks: 60, bonds: 40 },
    rebalancingSettings: { threshold: 5, enabled: true },
  };

  const mockHoldings = [
    {
      id: '1',
      symbol: 'AAPL',
      assetClass: 'stocks',
      marketValue: 7000,
      allocationPercentage: 70,
      currentPrice: 175,
    },
    {
      id: '2',
      symbol: 'BND',
      assetClass: 'bonds',
      marketValue: 3000,
      allocationPercentage: 30,
      currentPrice: 85,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RebalancingService,
        {
          provide: getRepositoryToken(Portfolio),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Holding),
          useValue: {},
        },
        {
          provide: getRepositoryToken(RebalancingRule),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: PortfolioService,
          useValue: {
            getPortfolioById: jest.fn(),
            getPortfolioHoldings: jest.fn(),
            updatePortfolioValue: jest.fn(),
          },
        },
        {
          provide: TradingExecutionService,
          useValue: {
            executeTrade: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaxLossHarvestingService>(TaxLossHarvestingService);
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    portfolioService = module.get<PortfolioService>(PortfolioService);
    tradingExecutionService = module.get<TradingExecutionService>(TradingExecutionService);
  });

  describe('identifyTaxLossOpportunities', () => {
    it('should identify tax loss opportunities correctly', async () => {
      jest.spyOn(portfolioService, 'getPortfolioHoldings').mockResolvedValue(mockHoldings as any);
      jest.spyOn(service as any, 'getPurchaseTransactions').mockResolvedValue([
        { executedAt: new Date('2023-01-01') },
      ]);
      jest.spyOn(service as any, 'checkWashSaleRisk').mockResolvedValue(false);
      jest.spyOn(service as any, 'getReplacementSuggestions').mockResolvedValue(['MSFT', 'GOOGL']);

      const result = await service.identifyTaxLossOpportunities('1');

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].unrealizedLoss).toBe(500);
      expect(result[0].washSaleRisk).toBe(false);
    });

    it('should filter out small losses', async () => {
      const smallLossHoldings = [
        {
          id: '1',
          symbol: 'AAPL',
          quantity: 1,
          averageCost: 150,
          currentPrice: 149, // Only $1 loss
        },
      ];

      jest.spyOn(portfolioService, 'getPortfolioHoldings').mockResolvedValue(smallLossHoldings as any);

      const result = await service.identifyTaxLossOpportunities('1');

      expect(result).toHaveLength(0);
    });
  });

  describe('checkWashSaleRisk', () => {
    it('should detect wash sale risk', async () => {
      const recentBuyTransaction = {
        type: TransactionType.BUY,
        symbol: 'AAPL',
        executedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      jest.spyOn(transactionRepository, 'find').mockResolvedValue([recentBuyTransaction] as any);

      const result = await service['checkWashSaleRisk']('1', 'AAPL');

      expect(result).toBe(true);
    });

    it('should not detect wash sale risk for old transactions', async () => {
      const oldBuyTransaction = {
        type: TransactionType.BUY,
        symbol: 'AAPL',
        executedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
      };

      jest.spyOn(transactionRepository, 'find').mockResolvedValue([oldBuyTransaction] as any);

      const result = await service['checkWashSaleRisk']('1', 'AAPL');

      expect(result).toBe(false);
    });
  });

  describe('executeTaxLossHarvesting', () => {
    it('should execute tax loss harvesting successfully', async () => {
      const opportunity = {
        holdingId: '1',
        symbol: 'AAPL',
        unrealizedLoss: 500,
        washSaleRisk: false,
        replacementSuggestions: ['MSFT'],
      };

      const holding = mockHoldings[0];
      const portfolio = { id: '1' };

      jest.spyOn(service, 'identifyTaxLossOpportunities').mockResolvedValue([opportunity] as any);
      jest.spyOn(portfolioService, 'getPortfolioById').mockResolvedValue(portfolio as any);
      jest.spyOn(portfolioService, 'getPortfolioHoldings').mockResolvedValue([holding] as any);
      jest.spyOn(tradingExecutionService, 'executeTrade').mockResolvedValue({
        success: true,
        executedPrice: 150,
        executedQuantity: 10,
      } as any);
      jest.spyOn(transactionRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(portfolioService, 'updatePortfolioValue').mockResolvedValue();

      await service.executeTaxLossHarvesting('1', '1', 'MSFT');

      expect(tradingExecutionService.executeTrade).toHaveBeenCalledTimes(2); // Sell and buy
      expect(transactionRepository.save).toHaveBeenCalledTimes(2);
      expect(portfolioService.updatePortfolioValue).toHaveBeenCalled();
    });

    it('should throw error for wash sale risk', async () => {
      const opportunity = {
        holdingId: '1',
        washSaleRisk: true,
      };

      jest.spyOn(service, 'identifyTaxLossOpportunities').mockResolvedValue([opportunity] as any);

      await expect(service.executeTaxLossHarvesting('1', '1')).rejects.toThrow(
        'Cannot execute tax loss harvesting due to wash sale risk'
      );
    });
  });

  describe('calculatePotentialTaxSavings', () => {
    it('should calculate potential tax savings', async () => {
      const opportunities = [
        { unrealizedLoss: 1000 },
        { unrealizedLoss: 500 },
      ];

      jest.spyOn(service, 'identifyTaxLossOpportunities').mockResolvedValue(opportunities as any);

      const result = await service.calculatePotentialTaxSavings('1');

      expect(result.totalUnrealizedLosses).toBe(1500);
      expect(result.potentialTaxSavings).toBe(375); // 25% of 1500
      expect(result.opportunities).toBe(2);
    });
  });
});