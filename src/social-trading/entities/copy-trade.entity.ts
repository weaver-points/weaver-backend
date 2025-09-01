import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TraderProfile } from './trader-profile.entity';

export enum CopyTradeStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  EXPIRED = 'EXPIRED',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

@Entity('copy_trades')
export class CopyTrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  followerId: string;

  @ManyToOne(() => TraderProfile, (profile) => profile.copyTrades)
  traderProfile: TraderProfile;

  @Column()
  traderProfileId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  allocatedAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  copyRatio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  stopLoss: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  takeProfit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxDailyLoss: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxPositionSize: number;

  @Column({
    type: 'enum',
    enum: CopyTradeStatus,
    default: CopyTradeStatus.ACTIVE,
  })
  status: CopyTradeStatus;

  @Column({ type: 'enum', enum: RiskLevel, default: RiskLevel.MEDIUM })
  riskLevel: RiskLevel;

  @Column({ type: 'json', nullable: true })
  allowedInstruments: string[];

  @Column({ type: 'json', nullable: true })
  excludedInstruments: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalReturn: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPnL: number;

  @Column({ type: 'int', default: 0 })
  totalCopiedTrades: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
