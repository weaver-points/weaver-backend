import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      SentimentDataEntity,
      MarketPredictionEntity, 
      TradingSignalEntity,
    ]),
  ],
  controllers: [SentimentAnalysisController],
  providers: [SentimentAnalysisService],
  exports: [SentimentAnalysisService],
})
export class SentimentAnalysisModule {}