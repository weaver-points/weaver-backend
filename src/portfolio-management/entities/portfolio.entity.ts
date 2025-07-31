import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Holding } from './holding.entity';
import { Transaction } from './transaction.entity';
import { RebalancingRule } from './rebalancing-rule.entity';

export enum PortfolioType {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
  CUSTOM = 'custom',
}

export enum RiskTolerance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: PortfolioType,
    default: PortfolioType.MODERATE,
  })
  type: PortfolioType;

  @Column({
    type: 'enum',
    enum: RiskTolerance,
    default: RiskTolerance.MEDIUM,
  })
  riskTolerance: RiskTolerance;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalValue: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  cashBalance: number;

  @Column('jsonb', { nullable: true })
  targetAllocation: Record<string, number>;

  @Column('jsonb', { nullable: true })
  rebalancingSettings: {
    threshold: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    enabled: boolean;
  };

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Holding, holding => holding.portfolio)
  holdings: Holding[];

  @OneToMany(() => Transaction, transaction => transaction.portfolio)
  transactions: Transaction[];

  @OneToMany(() => RebalancingRule, rule => rule.portfolio)
  rebalancingRules: RebalancingRule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
