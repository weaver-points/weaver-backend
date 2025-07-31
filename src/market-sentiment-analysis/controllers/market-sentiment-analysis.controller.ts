import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Sentiment Analysis')
@Controller('sentiment')
export class SentimentAnalysisController {
  constructor(private readonly sentimentService: SentimentAnalysisService) {}

  @Get('current/:symbol')
  @ApiOperation({ summary: 'Get current sentiment for a symbol' })
  async getCurrentSentiment(@Param('symbol') symbol: string) {
    return this.sentimentService.getCurrentSentiment(symbol.toUpperCase());
  }

  @Get('historical/:symbol')
  @ApiOperation({ summary: 'Get historical sentiment data' })
  async getHistoricalSentiment(
    @Param('symbol') symbol: string,
    @Query('days') days: number = 7
  ) {
    return this.sentimentService.getHistoricalSentiment(symbol.toUpperCase(), days);
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Get market predictions' })
  async getMarketPredictions(@Query('symbol') symbol?: string) {
    return this.sentimentService.getMarketPredictions(symbol?.toUpperCase());
  }

  @Get('signals')
  @ApiOperation({ summary: 'Get active trading signals' })
  async getTradingSignals() {
    return this.sentimentService.getActiveTradingSignals();
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Trigger manual analysis for symbols' })
  async triggerAnalysis(@Body() { symbols }: { symbols: string[] }) {
    const upperSymbols = symbols.map(s => s.toUpperCase());
    
    const [twitter, reddit, news] = await Promise.all([
      this.sentimentService.analyzeTwitterSentiment(upperSymbols),
      this.sentimentService.analyzeRedditSentiment(upperSymbols),
      this.sentimentService.analyzeNewsSentiment(upperSymbols),
    ]);

    await this.sentimentService.generateMarketPredictions(upperSymbols);
    const signals = await this.sentimentService.generateTradingSignals(upperSymbols);

    return {
      analyzed_symbols: upperSymbols,
      data_points: twitter.length + reddit.length + news.length,
      signals_generated: signals.length,
    };
  }
}
