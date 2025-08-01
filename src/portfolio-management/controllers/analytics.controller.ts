import { Controller, Get, Param, Query } from '@nestjs/common';
import { PerformanceTrackingService } from '../services/performance-tracking.service';
import { RiskAssessmentService } from '../services/risk-assessment.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly performanceService: PerformanceTrackingService,
    private readonly riskService: RiskAssessmentService,
  ) {}

  @Get(':portfolioId/performance')
  async getPerformanceAnalytics(
    @Param('portfolioId') portfolioId: string,
    @Query('period') period: string = '1Y',
  ) {
    return this.performanceService.calculatePerformanceMetrics(portfolioId, period);
  }

  @Get(':portfolioId/risk')
  async getRiskAnalytics(@Param('portfolioId') portfolioId: string) {
    return this.riskService.assessPortfolioRisk(portfolioId);
  }

  @Get(':portfolioId/optimization')
  async getOptimizationSuggestions(@Param('portfolioId') portfolioId: string) {
    return this.performanceService.getOptimizationSuggestions(portfolioId);
  }
}
