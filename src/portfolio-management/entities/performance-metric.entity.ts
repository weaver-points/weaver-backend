import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('performance_metrics')
export class PerformanceMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  portfolioId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  totalReturn: number;

  @Column('decimal', { precision: 5, scale: 2 })
  totalReturnPercentage: number;

  @Column('decimal', { precision: 5, scale: 2 })
  annualizedReturn: number;

  @Column('decimal', { precision: 5, scale: 2 })
  volatility: number;

  @Column('decimal', { precision: 5, scale: 2 })
  sharpeRatio: number;

  @Column('decimal', { precision: 5, scale: 2 })
  maxDrawdown: number;

  @Column('decimal', { precision: 5, scale: 2 })
  beta: number;

  @Column('decimal', { precision: 5, scale: 2 })
  alpha: number;

  @Column('date')
  periodStart: Date;

  @Column('date')
  periodEnd: Date;

  @CreateDateColumn()
  calculatedAt: Date;
}
