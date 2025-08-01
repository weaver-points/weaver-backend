import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PortfolioService } from '../services/portfolio.service';
import { CreatePortfolioDto, UpdatePortfolioDto } from '../dto/portfolio.dto';

@Controller('portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  async createPortfolio(@Body() createPortfolioDto: CreatePortfolioDto) {
    return this.portfolioService.createPortfolio(createPortfolioDto);
  }

  @Get()
  async getPortfolios(@Query('userId') userId: string) {
    return this.portfolioService.getPortfoliosByUser(userId);
  }

  @Get(':id')
  async getPortfolio(@Param('id') id: string) {
    return this.portfolioService.getPortfolioById(id);
  }

  @Put(':id')
  async updatePortfolio(
    @Param('id') id: string,
    @Body() updatePortfolioDto: UpdatePortfolioDto,
  ) {
    return this.portfolioService.updatePortfolio(id, updatePortfolioDto);
  }

  @Delete(':id')
  async deletePortfolio(@Param('id') id: string) {
    return this.portfolioService.deletePortfolio(id);
  }

  @Get(':id/holdings')
  async getPortfolioHoldings(@Param('id') id: string) {
    return this.portfolioService.getPortfolioHoldings(id);
  }

  @Post(':id/holdings')
  async addHolding(
    @Param('id') portfolioId: string,
    @Body() holdingData: any,
  ) {
    return this.portfolioService.addHolding(portfolioId, holdingData);
  }

  @Get(':id/performance')
  async getPortfolioPerformance(
    @Param('id') id: string,
    @Query('period') period: string = '1Y',
  ) {
    return this.portfolioService.getPortfolioPerformance(id, period);
  }
}
