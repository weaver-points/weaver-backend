import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { PortfolioManagementModule } from '../../src/portfolio-management/portfolio-management.module';
import { Portfolio } from '../../src/portfolio-management/entities/portfolio.entity';
import { Holding } from '../../src/portfolio-management/entities/holding.entity';
import { Transaction } from '../../src/portfolio-management/entities/transaction.entity';
import { RebalancingRule } from '../../src/portfolio-management/entities/rebalancing-rule.entity';
import { PerformanceMetric } from '../../src/portfolio-management/entities/performance-metric.entity';
import { RiskMetric } from '../../src/portfolio-management/entities/risk-metric.entity';

describe('Portfolio Management E2E Workflow', () => {
  let app: INestApplication;
  let portfolioId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Portfolio, Holding, Transaction, RebalancingRule, PerformanceMetric, RiskMetric],
          synchronize: true,
        }),
        PortfolioManagementModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Portfolio Lifecycle', () => {
    it('should create a portfolio and go through complete workflow', async () => {
      // Step 1: Create Portfolio
      const createResponse = await request(app.getHttpServer())
        .post('/portfolios')
        .send({
          name: 'E2E Test Portfolio',
          userId: 'e2e-user',
          type: 'moderate',
          riskTolerance: 'medium',
          cashBalance: 50000,
          targetAllocation: {
            stocks: 70,
            bonds: 20,
            alternatives: 10,
          },
        })
        .expect(201);

      portfolioId = createResponse.body.id;
      expect(createResponse.body.name).toBe('E2E Test Portfolio');

      // Step 2: Add Multiple Holdings
      const holdings = [
        {
          symbol: 'AAPL',
          assetName: 'Apple Inc.',
          assetClass: 'stocks',
          quantity: 100,
          averageCost: 150,
        },
        {
          symbol: 'GOOGL',
          assetName: 'Alphabet Inc.',
          assetClass: 'stocks',
          quantity: 50,
          averageCost: 2800,
        },
        {
          symbol: 'BND',
          assetName: 'Vanguard Total Bond Market',
          assetClass: 'bonds',
          quantity: 200,
          averageCost: 85,
        },
        {
          symbol: 'VNQ',
          assetName: 'Vanguard Real Estate ETF',
          assetClass: 'alternatives',
          quantity: 100,
          averageCost: 90,
        },
      ];

      for (const holding of holdings) {
        await request(app.getHttpServer())
          .post(`/portfolios/${portfolioId}/holdings`)
          .send(holding)
          .expect(201);
      }

      // Step 3: Verify Portfolio State
      const portfolioResponse = await request(app.getHttpServer())
        .get(`/portfolios/${portfolioId}`)
        .expect(200);

      expect(portfolioResponse.body.holdings).toHaveLength(4);
      expect(portfolioResponse.body.totalValue).toBeGreaterThan(0);

      // Step 4: Analyze Rebalancing Needs
      const rebalanceAnalysis = await request(app.getHttpServer())
        .post(`/rebalancing/${portfolioId}/analyze`)
        .expect(201);

      expect(rebalanceAnalysis.body).toHaveProperty('rebalancingNeeded');
      expect(rebalanceAnalysis.body).toHaveProperty('currentAllocations');
      expect(rebalanceAnalysis.body).toHaveProperty('suggestedTrades');

      // Step 5: Execute Rebalancing if Needed
      if (rebalanceAnalysis.body.rebalancingNeeded) {
        await request(app.getHttpServer())
          .post(`/rebalancing/${portfolioId}/execute`)
          .send({ automatic: false })
          .expect(201);
      }

      // Step 6: Get Performance Analytics
      const performanceResponse = await request(app.getHttpServer())
        .get(`/analytics/${portfolioId}/performance?period=1Y`)
        .expect(200);

      expect(performanceResponse.body).toHaveProperty('totalReturn');
      expect(performanceResponse.body).toHaveProperty('annualizedReturn');
      expect(performanceResponse.body).toHaveProperty('sharpeRatio');

      // Step 7: Get Risk Assessment
      const riskResponse = await request(app.getHttpServer())
        .get(`/analytics/${portfolioId}/risk`)
        .expect(200);

      expect(riskResponse.body).toHaveProperty('valueAtRisk');
      expect(riskResponse.body).toHaveProperty('concentrationRisk');
      expect(riskResponse.body).toHaveProperty('riskScore');
      expect(riskResponse.body.riskScore).toBeGreaterThanOrEqual(1);
      expect(riskResponse.body.riskScore).toBeLessThanOrEqual(10);

      // Step 8: Get Optimization Suggestions
      const optimizationResponse = await request(app.getHttpServer())
        .get(`/analytics/${portfolioId}/optimization`)
        .expect(200);

      expect(optimizationResponse.body).toHaveProperty('suggestions');
      expect(Array.isArray(optimizationResponse.body.suggestions)).toBe(true);

      // Step 9: Update Portfolio Settings
      await request(app.getHttpServer())
        .put(`/portfolios/${portfolioId}`)
        .send({
          name: 'Updated E2E Test Portfolio',
          riskTolerance: 'high',
          targetAllocation: {
            stocks: 80,
            bonds: 15,
            alternatives: 5,
          },
        })
        .expect(200);

      // Step 10: Verify Update
      const updatedPortfolio = await request(app.getHttpServer())
        .get(`/portfolios/${portfolioId}`)
        .expect(200);

      expect(updatedPortfolio.body.name).toBe('Updated E2E Test Portfolio');
      expect(updatedPortfolio.body.riskTolerance).toBe('high');
      expect(updatedPortfolio.body.targetAllocation.stocks).toBe(80);
    });

    it('should handle tax loss harvesting workflow', async () => {
      // This would require a portfolio with some losing positions
      // For now, we'll test the endpoints exist and return proper responses

      const response = await request(app.getHttpServer())
        .get(`/analytics/${portfolioId}/tax-loss-opportunities`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle multiple portfolios for same user', async () => {
      // Create second portfolio
      const secondPortfolio = await request(app.getHttpServer())
        .post('/portfolios')
        .send({
          name: 'Second Portfolio',
          userId: 'e2e-user',
          type: 'conservative',
          riskTolerance: 'low',
          cashBalance: 25000,
        })
        .expect(201);

      // Get all portfolios for user
      const userPortfolios = await request(app.getHttpServer())
        .get('/portfolios?userId=e2e-user')
        .expect(200);

      expect(userPortfolios.body).toHaveLength(2);
      expect(userPortfolios.body.some(p => p.name === 'Updated E2E Test Portfolio')).toBe(true);
      expect(userPortfolios.body.some(p => p.name === 'Second Portfolio')).toBe(true);
    });
  });
});