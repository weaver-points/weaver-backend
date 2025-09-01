import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CopyTrade } from './copy-trade.entity';
import { TradingStrategy } from './trading-strategy.entity';
import { PerformanceMetric } from './performance-metric.entity';

@Entity('trader_profiles')
export class TraderProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalReturn: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  winRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maxDrawdown: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  sharpeRatio: number;

  @Column({ type: 'int', default: 0 })
  totalTrades: number;

  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  assetsUnderManagement: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  managementFee: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  performanceFee: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'json', nullable: true })
  tradingHours: {
    timezone: string;
    start: string;
    end: string;
  };

  @OneToMany(() => CopyTrade, (copyTrade) => copyTrade.traderProfile)
  copyTrades: CopyTrade[];

  @OneToMany(() => TradingStrategy, (strategy) => strategy.trader)
  strategies: TradingStrategy[];

  @OneToMany(() => PerformanceMetric, (metric) => metric.trader)
  performanceMetrics: PerformanceMetric[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
