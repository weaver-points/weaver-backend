import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { RebalancingService } from '../services/rebalancing.service';

@Controller('rebalancing')
export class RebalancingController {
  constructor(private readonly rebalancingService: RebalancingService) {}

  @Post(':portfolioId/analyze')
  async analyzeRebalancing(@Param('portfolioId') portfolioId: string) {
    return this.rebalancingService.analyzeRebalancing(portfolioId);
  }

  @Post(':portfolioId/execute')
  async executeRebalancing(
    @Param('portfolioId') portfolioId: string,
    @Body() options: any,
  ) {
    return this.rebalancingService.executeRebalancing(portfolioId, options);
  }

  @Get(':portfolioId/history')
  async getRebalancingHistory(@Param('portfolioId') portfolioId: string) {
    return this.rebalancingService.getRebalancingHistory(portfolioId);
  }
}