import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TraderProfile } from './trader-profile.entity';

export enum StrategyType {
  SCALPING = 'SCALPING',
  DAY_TRADING = 'DAY_TRADING',
  SWING_TRADING = 'SWING_TRADING',
  POSITION_TRADING = 'POSITION_TRADING',
  ALGORITHMIC = 'ALGORITHMIC',
}

@Entity('trading_strategies')
export class TradingStrategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: StrategyType })
  type: StrategyType;

  @ManyToOne(() => TraderProfile, (trader) => trader.strategies)
  trader: TraderProfile;

  @Column()
  traderId: string;

  @Column({ type: 'json' })
  parameters: {
    timeframes: string[];
    instruments: string[];
    riskPerTrade: number;
    maxPositions: number;
    entryRules: string[];
    exitRules: string[];
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  backtestReturn: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  backtestWinRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  backtestSharpe: number;

  @Column({ type: 'int', default: 0 })
  liveTradesCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  livePerformance: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
