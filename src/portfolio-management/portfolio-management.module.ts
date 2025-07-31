import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { PortfolioController } from './controllers/portfolio.controller';
import { RebalancingController } from './controllers/rebalancing.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { PortfolioService } from './services/portfolio.service';
import { RebalancingService } from './services/rebalancing.service';
import { RiskAssessmentService } from './services/risk-assessment.service';
import { PerformanceTrackingService } from './services/performance-tracking.service';
import { AssetAllocationService } from './services/asset-allocation.service';
import { TaxLossHarvestingService } from './services/tax-loss-harvesting.service';
import { MarketDataService } from './services/market-data.service';
import { TradingExecutionService } from './services/trading-execution.service';
import { Portfolio } from './entities/portfolio.entity';
import { Holding } from './entities/holding.entity';
import { Transaction } from './entities/transaction.entity';
import { RebalancingRule } from './entities/rebalancing-rule.entity';
import { PerformanceMetric } from './entities/performance-metric.entity';
import { RiskMetric } from './entities/risk-metric.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Portfolio,
      Holding,
      Transaction,
      RebalancingRule,
      PerformanceMetric,
      RiskMetric,
    ]),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [
    PortfolioController,
    RebalancingController,
    AnalyticsController,
  ],
  providers: [
    PortfolioService,
    RebalancingService,
    RiskAssessmentService,
    PerformanceTrackingService,
    AssetAllocationService,
    TaxLossHarvestingService,
    MarketDataService,
    TradingExecutionService,
  ],
  exports: [
    PortfolioService,
    RebalancingService,
    PerformanceTrackingService,
  ],
})
export class PortfolioManagementModule {}