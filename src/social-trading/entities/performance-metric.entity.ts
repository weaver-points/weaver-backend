import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { TraderProfile } from './trader-profile.entity';

export enum MetricType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

@Entity('performance_metrics')
export class PerformanceMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TraderProfile, (trader) => trader.performanceMetrics)
  trader: TraderProfile;

  @Column()
  traderId: string;

  @Column({ type: 'enum', enum: MetricType })
  type: MetricType;

  @Column({ type: 'date' })
  period: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  return: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  pnl: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  winRate: number;

  @Column({ type: 'int' })
  totalTrades: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  averageWin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  averageLoss: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  profitFactor: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  sharpeRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  maxDrawdown: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  volume: number;

  @CreateDateColumn()
  createdAt: Date;
}
