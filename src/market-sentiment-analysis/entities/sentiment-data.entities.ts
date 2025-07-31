import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('sentiment_data')
@Index(['symbol', 'timestamp'])
@Index(['source', 'timestamp'])
export class SentimentDataEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  source: string;

  @Column('text')
  content: string;

  @Column('decimal', { precision: 5, scale: 4 })
  sentiment: number;

  @Column('decimal', { precision: 5, scale: 4 })
  confidence: number;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  engagement: number;

  @Column({ nullable: true })
  symbol: string;

  @Column('decimal', { precision: 5, scale: 4, nullable: true })
  impact_score: number;
}

@Entity('market_predictions')
@Index(['symbol', 'created_at'])
export class MarketPredictionEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  symbol: string;

  @Column()
  prediction: string;

  @Column('decimal', { precision: 5, scale: 4 })
  confidence: number;

  @Column()
  timeframe: string;

  @Column('decimal', { precision: 5, scale: 4 })
  sentiment_score: number;

  @Column('json')
  factors: string[];

  @CreateDateColumn()
  created_at: Date;
}

@Entity('trading_signals')
@Index(['symbol', 'created_at'])
export class TradingSignalEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  symbol: string;

  @Column()
  action: string;

  @Column('decimal', { precision: 5, scale: 4 })
  strength: number;

  @Column('decimal', { precision: 5, scale: 4 })
  sentiment_score: number;

  @Column('decimal', { precision: 5, scale: 4 })
  news_impact: number;

  @Column('decimal', { precision: 5, scale: 4 })
  social_impact: number;

  @CreateDateColumn()
  created_at: Date;

  @Column()
  expires_at: Date;
}
