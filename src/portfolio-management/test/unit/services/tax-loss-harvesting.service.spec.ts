import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxLossHarvestingService } from '../../../src/portfolio-management/services/tax-loss-harvesting.service';
import { Transaction, TransactionType } from '../../../src/portfolio-management/entities/transaction.entity';
import { PortfolioService } from '../../../src/portfolio-management/services/portfolio.service';
import { TradingExecutionService } from '../../../src/portfolio-management/services/trading-execution.service';

describe('TaxLossHarvestingService', () => {
  let service: TaxLossHarvestingService;
  let transactionRepository: Repository<Transaction>;
  let portfolioService: PortfolioService;
  let tradingExecutionService: TradingExecutionService;

  const mockHoldings = [
    {
      id: '1',
      symbol: 'AAPL',
      quantity: 10,
      averageCost: 200,
      currentPrice: 150, // $500 unrealized loss
    },
    {
      id: '2',
      symbol: 'GOOGL',
      quantity: 5,
      averageCost: 2000,
      currentPrice: 2100, // $500 unrealized gain
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxLossHarvestingService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: PortfolioService,
          useValue: {
            getPortfolioHoldings: jest.fn().mockResolvedValue(mockHoldings),
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