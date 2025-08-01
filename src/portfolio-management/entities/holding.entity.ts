import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Portfolio } from './portfolio.entity';

@Entity('holdings')
export class Holding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  symbol: string;

  @Column()
  assetName: string;

  @Column()
  assetClass: string; // stocks, bonds, etfs, crypto, etc.

  @Column('decimal', { precision: 15, scale: 8 })
  quantity: number;

  @Column('decimal', { precision: 15, scale: 2 })
  averageCost: number;

  @Column('decimal', { precision: 15, scale: 2 })
  currentPrice: number;

  @Column('decimal', { precision: 15, scale: 2 })
  marketValue: number;

  @Column('decimal', { precision: 5, scale: 2 })
  allocationPercentage: number;

  @ManyToOne(() => Portfolio, portfolio => portfolio.holdings)
  portfolio: Portfolio;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
