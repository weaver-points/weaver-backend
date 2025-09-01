import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TraderProfile } from './entities/trader-profile.entity';
import { CopyTrade } from './entities/copy-trade.entity';
import { TradingStrategy } from './entities/trading-strategy.entity';
import { PerformanceMetric } from './entities/performance-metric.entity';
import { SocialTradingService } from './services/social-trading.service';
import { CopyTradingService } from './services/copy-trading.service';
import { PerformanceAnalyticsService } from './services/performance-analytics.service';
import { RiskManagementService } from './services/risk-management.service';
import { SocialTradingController } from './controllers/social-trading.controller';
import { CopyTradingStrategy } from './strategies/copy-trading-strategy';
import { RiskManagementStrategy } from './strategies/risk-management-strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TraderProfile,
      CopyTrade,
      TradingStrategy,
      PerformanceMetric,
    ]),
  ],
  controllers: [SocialTradingController],
  providers: [
    SocialTradingService,
    CopyTradingService,
    PerformanceAnalyticsService,
    RiskManagementService,
    CopyTradingStrategy,
    RiskManagementStrategy,
  ],
  exports: [
    SocialTradingService,
    CopyTradingService,
    PerformanceAnalyticsService,
    RiskManagementService,
  ],
})
export class SocialTradingModule {}

export { TraderProfile, CopyTrade, TradingStrategy, PerformanceMetric };
