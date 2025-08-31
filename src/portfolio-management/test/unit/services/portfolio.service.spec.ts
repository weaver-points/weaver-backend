import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PortfolioService } from '../../../src/portfolio-management/services/portfolio.service';
import { Portfolio, PortfolioType, RiskTolerance } from '../../../src/portfolio-management/entities/portfolio.entity';
import { Holding } from '../../../src/portfolio-management/entities/holding.entity';
import { Transaction } from '../../../src/portfolio-management/entities/transaction.entity';
import { MarketDataService } from '../../../src/portfolio-management/services/market-data.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let portfolioRepository: Repository<Portfolio>;
  let holdingRepository: Repository<Holding>;
  let transactionRepository: Repository<Transaction>;
  let marketDataService: MarketDataService;

  const mockPortfolio = {
    id: '1',
    name: 'Test Portfolio',
    userId: 'user123',
    type: PortfolioType.MODERATE,
    riskTolerance: RiskTolerance.MEDIUM,
    totalValue: 10000,
    cashBalance: 1000,
    targetAllocation: { stocks: 60, bonds: 40 },
    isActive: true,
    holdings: [],
    transactions: [],
    rebalancingRules: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockHolding = {
    id: '1',
    symbol: 'AAPL',
    assetName: 'Apple Inc.',
    assetClass: 'stocks',
    quantity: 10,
    averageCost: 150,
    currentPrice: 175,
    marketValue: 1750,
    allocationPercentage: 17.5,
    portfolio: mockPortfolio,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: getRepositoryToken(Portfolio),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Holding),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: MarketDataService,
          useValue: {
            getCurrentPrice: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    portfolioRepository = module.get<Repository<Portfolio>>(getRepositoryToken(Portfolio));
    holdingRepository = module.get<Repository<Holding>>(getRepositoryToken(Holding));
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    marketDataService = module.get<MarketDataService>(MarketDataService);
  });

  describe('createPortfolio', () => {
    it('should create a new portfolio successfully', async () => {
      const createPortfolioDto = {
        name: 'Test Portfolio',
        userId: 'user123',
        type: PortfolioType.MODERATE,
        riskTolerance: RiskTolerance.MEDIUM,
      };

      jest.spyOn(portfolioRepository, 'create').mockReturnValue(mockPortfolio as Portfolio);
      jest.spyOn(portfolioRepository, 'save').mockResolvedValue(mockPortfolio as Portfolio);

      const result = await service.createPortfolio(createPortfolioDto);

      expect(portfolioRepository.create).toHaveBeenCalledWith({
        ...createPortfolioDto,
        rebalancingSettings: {
          threshold: 5,
          frequency: 'monthly',
          enabled: true,
        },
      });
      expect(portfolioRepository.save).toHaveBeenCalledWith(mockPortfolio);
      expect(result).toEqual(mockPortfolio);
    });
  });

  describe('getPortfolioById', () => {
    it('should return a portfolio by id', async () => {
      jest.spyOn(portfolioRepository, 'findOne').mockResolvedValue(mockPortfolio as Portfolio);

      const result = await service.getPortfolioById('1');

      expect(portfolioRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['holdings', 'transactions', 'rebalancingRules'],
      });
      expect(result).toEqual(mockPortfolio);
    });

    it('should throw NotFoundException when portfolio not found', async () => {
      jest.spyOn(portfolioRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPortfolioById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPortfoliosByUser', () => {
    it('should return portfolios for a user', async () => {
      const portfolios = [mockPortfolio];
      jest.spyOn(portfolioRepository, 'find').mockResolvedValue(portfolios as Portfolio[]);

      const result = await service.getPortfoliosByUser('user123');

      expect(portfolioRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user123', isActive: true },
        relations: ['holdings'],
      });
      expect(result).toEqual(portfolios);
    });
  });

  describe('addHolding', () => {
    it('should add a holding to portfolio', async () => {
      const holdingData = {
        symbol: 'AAPL',
        assetName: 'Apple Inc.',
        assetClass: 'stocks',
        quantity: 10,
        averageCost: 150,
      };

      jest.spyOn(service, 'getPortfolioById').mockResolvedValue(mockPortfolio as Portfolio);
      jest.spyOn(marketDataService, 'getCurrentPrice').mockResolvedValue(175);
      jest.spyOn(holdingRepository, 'create').mockReturnValue(mockHolding as Holding);
      jest.spyOn(holdingRepository, 'save').mockResolvedValue(mockHolding as Holding);
      jest.spyOn(transactionRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(service, 'updatePortfolioValue').mockResolvedValue();

      const result = await service.addHolding('1', holdingData);

      expect(marketDataService.getCurrentPrice).toHaveBeenCalledWith('AAPL');
      expect(holdingRepository.create).toHaveBeenCalledWith({
        ...holdingData,
        portfolio: mockPortfolio,
        currentPrice: 175,
        marketValue: 1750,
      });
      expect(result).toEqual(mockHolding);
    });
  });

  describe('updatePortfolioValue', () => {
    it('should update portfolio total value', async () => {
      const holdings = [mockHolding];
      
      jest.spyOn(service, 'getPortfolioHoldings').mockResolvedValue(holdings as Holding[]);
      jest.spyOn(marketDataService, 'getCurrentPrice').mockResolvedValue(180);
      jest.spyOn(holdingRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(service, 'getPortfolioById').mockResolvedValue(mockPortfolio as Portfolio);
      jest.spyOn(portfolioRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(service as any, 'updateAllocationPercentages').mockResolvedValue();

      await service.updatePortfolioValue('1');

      expect(marketDataService.getCurrentPrice).toHaveBeenCalledWith('AAPL');
      expect(portfolioRepository.save).toHaveBeenCalled();
    });
  });
});