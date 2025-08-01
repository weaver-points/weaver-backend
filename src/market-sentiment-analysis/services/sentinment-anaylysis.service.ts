import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, firstValueFrom } from 'rxjs';
import * as natural from 'natural';

@Injectable()
export class SentimentAnalysisService {
  private readonly logger = new Logger(SentimentAnalysisService.name);
  private readonly sentiment = new natural.SentimentAnalyzer('English', 
    natural.PorterStemmer, 'afinn');
  private readonly tokenizer = new natural.WordTokenizer();

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(SentimentData) 
    private sentimentRepo: Repository<SentimentData>,
    @InjectRepository(MarketPrediction) 
    private predictionRepo: Repository<MarketPrediction>,
    @InjectRepository(TradingSignal) 
    private signalRepo: Repository<TradingSignal>,
  ) {}

  // ========================
  // SOCIAL MEDIA ANALYSIS
  // ========================

  async analyzeTwitterSentiment(symbols: string[]): Promise<SentimentData[]> {
    const config = this.configService.get<SentimentAnalysisConfig>('sentiment');
    if (!config.twitter.enabled) return [];

    const results: SentimentData[] = [];

    for (const symbol of symbols) {
      try {
        const response = await firstValueFrom(
          this.httpService.get('https://api.twitter.com/2/tweets/search/recent', {
            params: {
              query: `$${symbol} OR ${symbol} -is:retweet`,
              max_results: 100,
              'tweet.fields': 'created_at,public_metrics,author_id',
            },
            headers: {
              'Authorization': `Bearer ${config.twitter.bearer_token}`,
            },
          })
        );

        const tweets = response.data.data || [];
        
        for (const tweet of tweets) {
          const sentimentScore = this.analyzeSentiment(tweet.text);
          const engagement = tweet.public_metrics?.like_count + 
                           tweet.public_metrics?.retweet_count + 
                           tweet.public_metrics?.reply_count || 0;

          const sentimentData: SentimentData = {
            id: tweet.id,
            source: 'twitter',
            content: tweet.text,
            sentiment: sentimentScore.score,
            confidence: sentimentScore.confidence,
            timestamp: new Date(tweet.created_at),
            author: tweet.author_id,
            engagement,
            symbol,
            impact_score: this.calculateImpactScore(sentimentScore.score, engagement),
          };

          results.push(sentimentData);
          await this.sentimentRepo.save(sentimentData);
        }
      } catch (error) {
        this.logger.error(`Twitter analysis failed for ${symbol}:`, error);
      }
    }

    return results;
  }

  async analyzeRedditSentiment(symbols: string[]): Promise<SentimentData[]> {
    const config = this.configService.get<SentimentAnalysisConfig>('sentiment');
    if (!config.reddit.enabled) return [];

    const results: SentimentData[] = [];

    for (const symbol of symbols) {
      try {
        // Get Reddit access token
        const authResponse = await firstValueFrom(
          this.httpService.post('https://www.reddit.com/api/v1/access_token', 
            'grant_type=client_credentials',
            {
              headers: {
                'Authorization': `Basic ${Buffer.from(
                  `${config.reddit.client_id}:${config.reddit.client_secret}`
                ).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'SentimentBot/1.0',
              },
            }
          )
        );

        const accessToken = authResponse.data.access_token;

        // Search for posts about the symbol
        const response = await firstValueFrom(
          this.httpService.get(`https://oauth.reddit.com/search`, {
            params: {
              q: symbol,
              sort: 'new',
              limit: 100,
              type: 'link',
            },
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': 'SentimentBot/1.0',
            },
          })
        );

        const posts = response.data.data?.children || [];

        for (const post of posts) {
          const postData = post.data;
          const content = `${postData.title} ${postData.selftext || ''}`;
          const sentimentScore = this.analyzeSentiment(content);

          const sentimentData: SentimentData = {
            id: postData.id,
            source: 'reddit',
            content,
            sentiment: sentimentScore.score,
            confidence: sentimentScore.confidence,
            timestamp: new Date(postData.created_utc * 1000),
            author: postData.author,
            engagement: postData.score + postData.num_comments,
            symbol,
            impact_score: this.calculateImpactScore(
              sentimentScore.score, 
              postData.score + postData.num_comments
            ),
          };

          results.push(sentimentData);
          await this.sentimentRepo.save(sentimentData);
        }
      } catch (error) {
        this.logger.error(`Reddit analysis failed for ${symbol}:`, error);
      }
    }

    return results;
  }
async analyzeNewsSentiment(symbols: string[]): Promise<SentimentData[]> {
    const config = this.configService.get<SentimentAnalysisConfig>('sentiment');
    if (!config.news.enabled) return [];

    const results: SentimentData[] = [];

    for (const symbol of symbols) {
      try {
        // Using NewsAPI as example
        const response = await firstValueFrom(
          this.httpService.get('https://newsapi.org/v2/everything', {
            params: {
              q: `${symbol} AND (stock OR trading OR market)`,
              sortBy: 'publishedAt',
              pageSize: 100,
              language: 'en',
            },
            headers: {
              'X-API-Key': config.news.api_keys[0], // Rotate through keys
            },
          })
        );

        const articles = response.data.articles || [];

        for (const article of articles) {
          const content = `${article.title} ${article.description || ''}`;
          const sentimentScore = this.analyzeSentiment(content);
          
          // Enhanced impact scoring for news
          const impactScore = await this.calculateNewsImpactScore(
            article, 
            sentimentScore.score
          );

          const sentimentData: SentimentData = {
            id: this.generateId(article.url),
            source: 'news',
            content,
            sentiment: sentimentScore.score,
            confidence: sentimentScore.confidence,
            timestamp: new Date(article.publishedAt),
            author: article.source?.name,
            symbol,
            impact_score: impactScore,
          };

          results.push(sentimentData);
          await this.sentimentRepo.save(sentimentData);
        }
      } catch (error) {
        this.logger.error(`News analysis failed for ${symbol}:`, error);
      }
    }

    return results;
}
    private analyzeSentiment(text: string): { score: number; confidence: number } {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stemmed = tokens.map(token => natural.PorterStemmer.stem(token));
    
    // Use AFINN sentiment analysis
    const score = this.sentiment.getSentiment(stemmed);
    
    // Normalize score to -1 to 1 range
    const normalizedScore = Math.max(-1, Math.min(1, score / 5));
    
    // Calculate confidence based on token count and sentiment strength
    const confidence = Math.min(1, (Math.abs(normalizedScore) + tokens.length / 50));
    
    return { score: normalizedScore, confidence };
  }

  async getAdvancedSentiment(text: string): Promise<{ score: number; confidence: number }> {
    try {
      const config = this.configService.get<SentimentAnalysisConfig>('sentiment');
      
      // Call Python ML service for advanced sentiment analysis
      const response = await firstValueFrom(
        this.httpService.post(`${config.ml_service_url}/analyze_sentiment`, {
          text,
          model: 'transformer', // BERT, RoBERTa, etc.
        })
      );

      return {
        score: response.data.sentiment_score,
        confidence: response.data.confidence,
      };
    } catch (error) {
      this.logger.warn('Advanced sentiment analysis failed, falling back to basic analysis');
      return this.analyzeSentiment(text);
    }
  }


  async generateMarketPredictions(symbols: string[]): Promise<MarketPrediction[]> {
    const predictions: MarketPrediction[] = [];

    for (const symbol of symbols) {
      try {
        // Get recent sentiment data
        const recentSentiments = await this.sentimentRepo.find({
          where: { 
            symbol,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
          order: { timestamp: 'DESC' },
          take: 1000,
        });

        if (recentSentiments.length === 0) continue;

        // Calculate weighted sentiment score
        const weightedSentiment = this.calculateWeightedSentiment(recentSentiments);
        
        // Generate predictions for different timeframes
        const timeframes: Array<'1h' | '4h' | '1d' | '1w'> = ['1h', '4h', '1d', '1w'];
        
        for (const timeframe of timeframes) {
          const prediction = await this.generatePredictionForTimeframe(
            symbol, 
            weightedSentiment, 
            timeframe,
            recentSentiments
          );
          
          predictions.push(prediction);
          await this.predictionRepo.save(prediction);
        }
      } catch (error) {
        this.logger.error(`Prediction generation failed for ${symbol}:`, error);
      }
    }

    return predictions;
  }

  private async generatePredictionForTimeframe(
    symbol: string,
    sentimentScore: number,
    timeframe: '1h' | '4h' | '1d' | '1w',
    sentiments: SentimentData[]
  ): Promise<MarketPrediction> {
    
    // ML-based prediction logic
    const factors: string[] = [];
    let prediction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 0;

    // Sentiment-based prediction
    if (sentimentScore > 0.2) {
      prediction = 'bullish';
      confidence += 0.3;
      factors.push('Positive sentiment trend');
    } else if (sentimentScore < -0.2) {
      prediction = 'bearish';
      confidence += 0.3;
      factors.push('Negative sentiment trend');
    } else {
      factors.push('Neutral sentiment');
    }

    // Volume/engagement analysis
    const avgEngagement = sentiments.reduce((sum, s) => sum + (s.engagement || 0), 0) / sentiments.length;
    if (avgEngagement > 100) {
      confidence += 0.2;
      factors.push('High social engagement');
    }

    // News impact analysis
    const newsImpact = sentiments
      .filter(s => s.source === 'news')
      .reduce((sum, s) => sum + (s.impact_score || 0), 0) / sentiments.length;
    
    if (newsImpact > 0.5) {
      confidence += 0.2;
      factors.push('Significant news impact');
    }

    // Timeframe adjustments
    const timeframeMultiplier = {
      '1h': 0.8,
      '4h': 0.9,
      '1d': 1.0,
      '1w': 1.1,
    }[timeframe];

    confidence = Math.min(1, confidence * timeframeMultiplier);

    return {
      symbol,
      prediction,
      confidence,
      timeframe,
      sentiment_score: sentimentScore,
      factors,
      created_at: new Date(),
    };
  }

  async generateTradingSignals(symbols: string[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    for (const symbol of symbols) {
      try {
        // Get recent predictions
        const recentPredictions = await this.predictionRepo.find({
          where: { symbol },
          order: { created_at: 'DESC' },
          take: 4, // Get latest predictions for all timeframes
        });

        if (recentPredictions.length === 0) continue;

        // Get sentiment breakdown
        const sentimentBreakdown = await this.getSentimentBreakdown(symbol);
        
        const signal = this.generateSignalFromPredictions(
          symbol,
          recentPredictions,
          sentimentBreakdown
        );

        if (signal) {
          signals.push(signal);
          await this.signalRepo.save(signal);
        }
      } catch (error) {
        this.logger.error(`Signal generation failed for ${symbol}:`, error);
      }
    }

    return signals;
  }

  private generateSignalFromPredictions(
    symbol: string,
    predictions: MarketPrediction[],
    sentimentBreakdown: { social_impact: number; news_impact: number; overall_sentiment: number }
  ): TradingSignal | null {
    
    // Calculate signal strength based on prediction consensus
    const bullishCount = predictions.filter(p => p.prediction === 'bullish').length;
    const bearishCount = predictions.filter(p => p.prediction === 'bearish').length;
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let strength = 0;

    if (bullishCount > bearishCount && avgConfidence > 0.6) {
      action = 'buy';
      strength = Math.min(1, (bullishCount / predictions.length) * avgConfidence);
    } else if (bearishCount > bullishCount && avgConfidence > 0.6) {
      action = 'sell';
      strength = Math.min(1, (bearishCount / predictions.length) * avgConfidence);
    }

    // Apply sentiment filters
    if (Math.abs(sentimentBreakdown.overall_sentiment) < 0.1) {
      strength *= 0.7; // Reduce strength for neutral sentiment
    }

    // Minimum strength threshold
    if (strength < 0.3) return null;

    return {
      id: this.generateId(`${symbol}-${Date.now()}`),
      symbol,
      action,
      strength,
      sentiment_score: sentimentBreakdown.overall_sentiment,
      news_impact: sentimentBreakdown.news_impact,
      social_impact: sentimentBreakdown.social_impact,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    };
  }


  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledSentimentAnalysis() {
    this.logger.log('Running scheduled sentiment analysis...');
    
    const watchedSymbols = this.configService.get<string[]>('watchedSymbols') || 
      ['BTC', 'ETH', 'AAPL', 'TSLA', 'MSFT'];

    try {
      await Promise.all([
        this.analyzeTwitterSentiment(watchedSymbols),
        this.analyzeRedditSentiment(watchedSymbols),
        this.analyzeNewsSentiment(watchedSymbols),
      ]);

      await this.generateMarketPredictions(watchedSymbols);
      await this.generateTradingSignals(watchedSymbols);

      this.logger.log('Scheduled sentiment analysis completed');
    } catch (error) {
      this.logger.error('Scheduled sentiment analysis failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldData() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    await this.sentimentRepo.delete({ timestamp: { $lt: cutoffDate } });
    await this.predictionRepo.delete({ created_at: { $lt: cutoffDate } });
    
    const expiredSignalsDate = new Date();
    await this.signalRepo.delete({ expires_at: { $lt: expiredSignalsDate } });
    
    this.logger.log('Old data cleanup completed');
  }

  private calculateWeightedSentiment(sentiments: SentimentData[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const sentiment of sentiments) {
      const timeWeight = this.calculateTimeWeight(sentiment.timestamp);
      const engagementWeight = Math.log10((sentiment.engagement || 1) + 1);
      const confidenceWeight = sentiment.confidence;
      
      const weight = timeWeight * engagementWeight * confidenceWeight;
      
      weightedSum += sentiment.sentiment * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateTimeWeight(timestamp: Date): number {
    const hoursAgo = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
    return Math.exp(-hoursAgo / 24); // Exponential decay over 24 hours
  }

  private calculateImpactScore(sentiment: number, engagement: number): number {
    const sentimentImpact = Math.abs(sentiment);
    const engagementImpact = Math.log10(engagement + 1) / 5; // Normalize
    return Math.min(1, sentimentImpact * 0.7 + engagementImpact * 0.3);
  }

  private async calculateNewsImpactScore(article: any, sentiment: number): Promise<number> {
    let impact = Math.abs(sentiment) * 0.5;
    
    // Source credibility scoring
    const credibleSources = ['reuters', 'bloomberg', 'wsj', 'cnbc', 'marketwatch'];
    const sourceName = (article.source?.name || '').toLowerCase();
    
    if (credibleSources.some(source => sourceName.includes(source))) {
      impact += 0.3;
    }

    // Title impact keywords
    const highImpactKeywords = ['crash', 'surge', 'breakthrough', 'scandal', 'merger', 'acquisition'];
    const title = (article.title || '').toLowerCase();
    
    if (highImpactKeywords.some(keyword => title.includes(keyword))) {
      impact += 0.2;
    }

    return Math.min(1, impact);
  }

  private async getSentimentBreakdown(symbol: string): Promise<{
    social_impact: number;
    news_impact: number;
    overall_sentiment: number;
  }> {
    const recentSentiments = await this.sentimentRepo.find({
      where: { 
        symbol,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    const socialSentiments = recentSentiments.filter(s => 
      ['twitter', 'reddit', 'discord'].includes(s.source)
    );
    const newsSentiments = recentSentiments.filter(s => s.source === 'news');

    const social_impact = socialSentiments.length > 0 ? 
      this.calculateWeightedSentiment(socialSentiments) : 0;
    
    const news_impact = newsSentiments.length > 0 ? 
      this.calculateWeightedSentiment(newsSentiments) : 0;
    
    const overall_sentiment = this.calculateWeightedSentiment(recentSentiments);

    return { social_impact, news_impact, overall_sentiment };
  }

  private generateId(input: string): string {
    return Buffer.from(input).toString('base64').slice(0, 16);
  }

  async getCurrentSentiment(symbol: string): Promise<{
    sentiment_score: number;
    confidence: number;
    breakdown: any;
    last_updated: Date;
  }> {
    const breakdown = await this.getSentimentBreakdown(symbol);
    
    return {
      sentiment_score: breakdown.overall_sentiment,
      confidence: Math.abs(breakdown.overall_sentiment),
      breakdown,
      last_updated: new Date(),
    };
  }

  async getHistoricalSentiment(
    symbol: string, 
    days: number = 7
  ): Promise<{ date: string; sentiment: number }[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const sentiments = await this.sentimentRepo
      .createQueryBuilder('sentiment')
      .select('DATE(sentiment.timestamp)', 'date')
      .addSelect('AVG(sentiment.sentiment)', 'sentiment')
      .where('sentiment.symbol = :symbol', { symbol })
      .andWhere('sentiment.timestamp >= :startDate', { startDate })
      .groupBy('DATE(sentiment.timestamp)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return sentiments.map(s => ({
      date: s.date,
      sentiment: parseFloat(s.sentiment),
    }));
  }

  async getActiveTradingSignals(): Promise<TradingSignal[]> {
    return this.signalRepo.find({
      where: { expires_at: { $gt: new Date() } },
      order: { created_at: 'DESC' },
    });
  }

  async getMarketPredictions(symbol?: string): Promise<MarketPrediction[]> {
    const where = symbol ? { symbol } : {};
    
    return this.predictionRepo.find({
      where,
      order: { created_at: 'DESC' },
      take: 100,
    });
  }
}

