import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';

import { SocialTradingService } from '../services/social-trading.service';
import { CopyTradingService } from '../services/copy-trading.service';
import { PerformanceAnalyticsService } from '../services/performance-analytics.service';
import { RiskManagementService } from '../services/risk-management.service';
import { CreateTraderProfileDto } from '../dto/create-trader-profile.dto';
import { CreateCopyTradeDto, UpdateCopyTradeDto } from '../dto/copy-trade.dto';

@Controller('social-trading')
export class SocialTradingController {
  constructor(
    private readonly socialTradingService: SocialTradingService,
    private readonly copyTradingService: CopyTradingService,
    private readonly performanceService: PerformanceAnalyticsService,
    private readonly riskService: RiskManagementService,
  ) {}

  @Post('traders')
  async createTraderProfile(
    @Request() req: any,
    @Body() dto: CreateTraderProfileDto,
  ) {
    return this.socialTradingService.createTraderProfile(dto);
  }

  @Get('traders/:id')
  async getTraderProfile(@Param('id') id: string) {
    return this.socialTradingService.getTraderProfile(id);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query() filters: any) {
    return this.socialTradingService.getTopTraders(filters);
  }

  @Post('follow/:traderId')
  async followTrader(@Request() req: any, @Param('traderId') traderId: string) {
    return this.socialTradingService.followTrader(req.user.id, traderId);
  }

  @Delete('follow/:traderId')
  async unfollowTrader(
    @Request() req: any,
    @Param('traderId') traderId: string,
  ) {
    return this.socialTradingService.unfollowTrader(req.user.id, traderId);
  }

  @Get('search')
  async searchTraders(@Query('q') query: string, @Query() filters: any) {
    return this.socialTradingService.searchTraders(query, filters);
  }

  @Post('copy-trades')
  async createCopyTrade(@Request() req: any, @Body() dto: CreateCopyTradeDto) {
    return this.copyTradingService.createCopyTrade(req.user.id, dto);
  }

  @Put('copy-trades/:id')
  async updateCopyTrade(
    @Param('id') id: string,
    @Body() dto: UpdateCopyTradeDto,
  ) {
    return this.copyTradingService.updateCopyTrade(id, dto);
  }

  @Delete('copy-trades/:id')
  async stopCopyTrade(@Param('id') id: string) {
    return this.copyTradingService.stopCopyTrade(id);
  }

  @Get('copy-trades')
  async getCopyTrades(@Request() req: any) {
    return this.copyTradingService.getCopyTrades(req.user.id);
  }

  @Get('copy-trades/:id/performance')
  async getCopyTradePerformance(@Param('id') id: string) {
    return this.copyTradingService.getCopyTradePerformance(id);
  }

  @Get('analytics/trader/:id')
  async getTraderAnalytics(
    @Param('id') id: string,
    @Query('days') days: number = 30,
  ) {
    return this.performanceService.getTraderPerformance(id, days);
  }

  @Get('analytics/compare')
  async compareTraders(@Query('traders') traderIds: string) {
    const ids = traderIds.split(',');
    return this.performanceService.compareTraders(ids);
  }

  @Post('analytics/backtest')
  async runBacktest(@Body() params: any) {
    return this.performanceService.runBacktest(
      params.strategyId,
      new Date(params.startDate),
      new Date(params.endDate),
    );
  }

  @Get('risk/portfolio')
  async getPortfolioRisk(@Request() req: any) {
    return this.riskService.calculatePortfolioRisk(req.user.id);
  }

  @Get('analytics/copy-trade/:id')
  async getCopyTradeAnalytics(@Param('id') id: string) {
    return this.performanceService.getCopyTradeAnalytics(id);
  }
}
