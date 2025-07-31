import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { PortfolioManagementModule } from '../../src/portfolio-management/portfolio-management.module';
import { Portfolio } from '../../src/portfolio-management/entities/portfolio.entity';
import { Holding } from '../../src/portfolio-management/entities/holding.entity';
import { Transaction } from '../../src/portfolio-management/entities/transaction.entity';

describe('Portfolio Management Integration', () => {
  let app: INestApplication;
  let portfolioRepository: Repository<Portfolio>;
  let holdingRepository: Repository<Holding>;
  let transactionRepository: Repository<Transaction>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Portfolio, Holding, Transaction],
          synchronize: true,
        }),
        PortfolioManagementModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    portfolioRepository = moduleFixture.get<Repository<Portfolio>>(getRepositoryToken(Portfolio));
    holdingRepository = moduleFixture.get<Repository<Holding>>(getRepositoryToken(Holding));
    transactionRepository = moduleFixture.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await portfolioRepository.clear();
    await holdingRepository.clear();
    await transactionRepository.clear();
  });

  describe('Portfolio CRUD Operations', () => {
    it('should create a new portfolio', async () => {
      const createPortfolioDto = {
        name: 'Test Portfolio',
        userId: 'user123',
        type: 'moderate',
        riskTolerance: 'medium',
        cashBalance: 10000,
      };

      const response = await request(app.getHttpServer())
        .post('/portfolios')
        .send(createPortfolioDto)
        .expect(201);

      expect(response.body.name).toBe('Test Portfolio');
      expect(response.body.userId).toBe('user123');
      expect(response.body.totalValue).toBe(10000);
    });

    it('should get portfolios by user', async () => {
      const portfolio = portfolioRepository.create({
        name: 'Test Portfolio',
        userId: 'user123',
        type: 'moderate',
        riskTolerance: 'medium',
        totalValue: 10000,
        cashBalance: 10000,
        isActive: true,
      });
      await portfolioRepository.save(portfolio);

      const response = await request(app.getHttpServer())
        .get('/portfolios?userId=user123')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Test Portfolio');
    });

    it('should get portfolio by id with holdings', async () => {
      const portfolio = portfolioRepository.create({
        name: 'Test Portfolio',
        userId: 'user123',
        type: 'moderate',
        riskTolerance: 'medium',
        totalValue: 10000,
        cashBalance: 10000,
        isActive: true,
      });
      const savedPortfolio = await portfolioRepository.save(portfolio);

      const holding = holdingRepository.create({
        symbol: 'AAPL',
        assetName: 'Apple Inc.',
        assetClass: 'stocks',
        quantity: 10,
        averageCost: 150,
        currentPrice: 175,
        marketValue: 1750,
        allocationPercentage: 17.5,
        portfolio: savedPortfolio,
      });
      await holdingRepository.save(holding);

      const response = await request(app.getHttpServer())
        .get(`/portfolios/${savedPortfolio.id}`)
        .expect(200);

      expect(response.body.holdings).toHaveLength(1);
      expect(response.body.holdings[0].symbol).toBe('AAPL');
    });

    it('should update portfolio', async () => {
      const portfolio = portfolioRepository.create({
        name: 'Test Portfolio',
        userId: 'user123',
        type: 'moderate',
        riskTolerance: 'medium',
        totalValue: 10000,
        cashBalance: 10000,
        isActive: true,
      });
      const savedPortfolio = await portfolioRepository.save(portfolio);

      const updateDto = {
        name: 'Updated Portfolio',
        riskTolerance: 'high',
      };

      const response = await request(app.getHttpServer())
        .put(`/portfolios/${savedPortfolio.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Updated Portfolio');
      expect(response.body.riskTolerance).toBe('high');
    });

    it('should add holding to portfolio', async () => {
      const portfolio = portfolioRepository.create({
        name: 'Test Portfolio',
        userId: 'user123',
        type: 'moderate',
        riskTolerance: 'medium',
        totalValue: 10000,
        cashBalance: 10000,
        isActive: true,
      });
      const savedPortfolio = await portfolioRepository.save(portfolio);

      const holdingDto = {
        symbol: 'AAPL',
        assetName: 'Apple Inc.',
        assetClass: 'stocks',
        quantity: 10,
        averageCost: 150,
      };

      const response = await request(app.getHttpServer())
        .post(`/portfolios/${savedPortfolio.id}/holdings`)
        .send(holdingDto)
        .expect(201);

      expect(response.body.symbol).toBe('AAPL');
      expect(response.body.quantity).toBe(10);
    });
  });

  describe('Rebalancing Operations', () => {
    let portfolio: Portfolio;

    beforeEach(async () => {
      portfolio = portfolioRepository.create({
        name: 'Rebalancing Test Portfolio',
        userId: 'user123',
        type: 'moderate',
        riskTolerance: 'medium',
        totalValue: 10000,
        cashBalance: 1000,
        targetAllocation: { stocks: 60, bonds: 40 },
        rebalancingSettings: { threshold: 5, frequency: 'monthly', enabled: true },
        isActive: true,
      });
      portfolio = await portfolioRepository.save(portfolio);

      // Add overweight stock holding
      const stockHolding = holdingRepository.create({
        symbol: 'AAPL',
        assetName: 'Apple Inc.',
        assetClass: 'stocks',
        quantity: 50,
        averageCost: 150,
        currentPrice: 175,
        marketValue: 8750,
        allocationPercentage: 87.5,
        portfolio,
      });
      await holdingRepository.save(stockHolding);

      // Add underweight bond holding
      const bondHolding = holdingRepository.create({
        symbol: 'BND',
        assetName: 'Vanguard Total Bond Market',
        assetClass: 'bonds',
        quantity: 15,
        averageCost: 85,
        currentPrice: 85,
        marketValue: 1275,
        allocationPercentage: 12.5,
        portfolio,
      });
      await holdingRepository.save(bondHolding);
    });

    it('should analyze rebalancing needs', async () => {
      const response = await request(app.getHttpServer())
        .post(`/rebalancing/${portfolio.id}/analyze`)
        .expect(201);

      expect(response.body.rebalancingNeeded).toBe(true);
      expect(response.body.currentAllocations.stocks).toBeCloseTo(87.5, 1);
      expect(response.body.currentAllocations.bonds).toBeCloseTo(12.5, 1);
      expect(response.body.deviations.stocks).toBeCloseTo(27.5, 1); // 87.5 - 60
      expect(response.body.deviations.bonds).toBeCloseTo(27.5, 1); // 40 - 12.5
    });

    it('should execute rebalancing', async () => {
      const response = await request(app.getHttpServer())
        .post(`/rebalancing/${portfolio.id}/execute`)
        .send({ dryRun: false })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should get rebalancing history', async () => {
      // First create some rebalancing transactions
      const rebalanceTransaction = transactionRepository.create({
        type: 'rebalance',
        symbol: 'AAPL',
        quantity: -10,
        price: 175,
        amount: 1750,
        description: 'Rebalancing sell',
        portfolio,
      });
      await transactionRepository.save(rebalanceTransaction);

      const response = await request(app.getHttpServer())
        .get(`/rebalancing/${portfolio.id}/history`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('rebalance');
    });
  });

  describe('Analytics Operations', () => {
    let portfolio: Portfolio;

    beforeEach(async () => {
      portfolio = portfolioRepository.create({
        name: 'Analytics Test Portfolio',
        userId: 'user123',
        type: 'moderate',
        riskTolerance: 'medium',
        totalValue: 10000,
        cashBalance: 1000,
        isActive: true,
      });
      portfolio = await portfolioRepository.save(portfolio);

      const holding = holdingRepository.create({
        symbol: 'AAPL',
        assetName: 'Apple Inc.',
        assetClass: 'stocks',
        quantity: 50,
        averageCost: 150,
        currentPrice: 175,
        marketValue: 8750,
        allocationPercentage: 87.5,
        portfolio,
      });
      await holdingRepository.save(holding);
    });

    it('should get performance analytics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/${portfolio.id}/performance?period=1Y`)
        .expect(200);

      expect(response.body.portfolioId).toBe(portfolio.id);
      expect(response.body).toHaveProperty('totalReturn');
      expect(response.body).toHaveProperty('annualizedReturn');
      expect(response.body).toHaveProperty('volatility');
      expect(response.body).toHaveProperty('sharpeRatio');
    });

    it('should get risk analytics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/${portfolio.id}/risk`)
        .expect(200);

      expect(response.body.portfolioId).toBe(portfolio.id);
      expect(response.body).toHaveProperty('valueAtRisk');
      expect(response.body).toHaveProperty('concentrationRisk');
      expect(response.body).toHaveProperty('riskScore');
      expect(response.body.riskScore).toBeGreaterThanOrEqual(1);
      expect(response.body.riskScore).toBeLessThanOrEqual(10);
    });

    it('should get optimization suggestions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/${portfolio.id}/optimization`)
        .expect(200);

      expect(response.body.portfolioId).toBe(portfolio.id);
      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent portfolio', async () => {
      await request(app.getHttpServer())
        .get('/portfolios/999')
        .expect(404);
    });

    it('should return 400 for invalid portfolio data', async () => {
      const invalidDto = {
        name: '', // Empty name
        userId: 'user123',
      };

      await request(app.getHttpServer())
        .post('/portfolios')
        .send(invalidDto)
        .expect(400);
    });

    it('should handle rebalancing for portfolio without target allocation', async () => {
      const portfolio = portfolioRepository.create({
        name: 'No Target Portfolio',
        userId: 'user123',
        type: 'moderate',
        riskTolerance: 'medium',
        totalValue: 10000,
        cashBalance: 10000,
        isActive: true,
      });
      const savedPortfolio = await portfolioRepository.save(portfolio);

      await request(app.getHttpServer())
        .post(`/rebalancing/${savedPortfolio.id}/analyze`)
        .expect(201);
    });
  });
});