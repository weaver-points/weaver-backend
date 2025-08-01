import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('risk_metrics')
export class RiskMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  portfolioId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  valueAtRisk: number; // VaR at 95% confidence

  @Column('decimal', { precision: 15, scale: 2 })
  conditionalVaR: number; // CVaR

  @Column('decimal', { precision: 5, scale: 2 })
  concentrationRisk: number;

  @Column('decimal', { precision: 5, scale: 2 })
  correlationRisk: number;

  @Column('jsonb')
  sectorExposure: Record<string, number>;

  @Column('jsonb')
  geographicExposure: Record<string, number>;

  @Column()
  riskScore: number; // 1-10 scale

  @CreateDateColumn()
  assessedAt: Date;
}