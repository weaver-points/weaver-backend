import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Portfolio } from './portfolio.entity';

@Entity('rebalancing_rules')
export class RebalancingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  assetClass: string;

  @Column('decimal', { precision: 5, scale: 2 })
  targetPercentage: number;

  @Column('decimal', { precision: 5, scale: 2 })
  toleranceBand: number; // percentage points

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  minAmount: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  maxAmount: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Portfolio, portfolio => portfolio.rebalancingRules)
  portfolio: Portfolio;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}