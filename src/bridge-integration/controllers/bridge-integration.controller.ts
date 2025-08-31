import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { BridgeIntegrationService } from '../services/bridge-integration.service';
import { BridgeMonitorService } from '../services/bridge-monitor.service';
import { BridgeAnalyticsService } from '../services/bridge-analytics.service';
import { BridgeQuoteDto, BridgeTransferDto } from '../dto/bridge-transfer.dto';
import { BridgeAnalyticsDto } from '../dto/bridge-analytics.dto';
import { BridgeStatusDto } from '../dto/bridge-status.dto';
import { BridgeQuote } from '../interface/bridge-adapter.interface';

@Controller('bridge')
export class BridgeIntegrationController {
  constructor(
    private readonly bridgeIntegrationService: BridgeIntegrationService,
    private readonly bridgeMonitorService: BridgeMonitorService,
    private readonly bridgeAnalyticsService: BridgeAnalyticsService,
  ) {}

  @Post('quote')
  async getQuotes(@Body() quoteDto: BridgeQuoteDto): Promise<BridgeQuote[]> {
    try {
      return await this.bridgeIntegrationService.getAllQuotes(quoteDto);
    } catch (error) {
      throw new BadRequestException('Failed to get bridge quotes');
    }
  }

  @Post('transfer')
  async executeBridge(
    @Body() transferDto: BridgeTransferDto,
  ): Promise<{ transactionId: string }> {
    try {
      const transactionId =
        await this.bridgeIntegrationService.executeBridge(transferDto);
      return { transactionId };
    } catch (error) {
      throw new BadRequestException('Failed to execute bridge transfer');
    }
  }

  @Get('transaction/:id/status')
  async getTransactionStatus(
    @Param('id') transactionId: string,
  ): Promise<BridgeStatusDto> {
    try {
      return await this.bridgeIntegrationService.getTransactionStatus(
        transactionId,
      );
    } catch (error) {
      throw new BadRequestException('Failed to get transaction status');
    }
  }

  @Get('routes')
  async getSupportedRoutes() {
    try {
      return await this.bridgeIntegrationService.getSupportedRoutes();
    } catch (error) {
      throw new BadRequestException('Failed to get supported routes');
    }
  }

  @Get('metrics')
  async getTransactionMetrics() {
    try {
      return await this.bridgeMonitorService.getTransactionMetrics();
    } catch (error) {
      throw new BadRequestException('Failed to get transaction metrics');
    }
  }

  @Get('analytics')
  async getAnalytics(
    @Query('days') days?: number,
  ): Promise<BridgeAnalyticsDto> {
    try {
      const analyticsDays = days && days > 0 ? Math.min(days, 365) : 30;
      return await this.bridgeAnalyticsService.getAnalytics(analyticsDays);
    } catch (error) {
      throw new BadRequestException('Failed to get analytics');
    }
  }

  @Get('liquidity')
  async getLiquidityMetrics() {
    try {
      return await this.bridgeAnalyticsService.getLiquidityMetrics();
    } catch (error) {
      throw new BadRequestException('Failed to get liquidity metrics');
    }
  }


}
