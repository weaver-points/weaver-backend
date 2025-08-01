import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Portfolio } from './portfolio.entity';

export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell',
  DIVIDEND = 'dividend',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  REBALANCE = 'rebalance',
  TAX_LOSS_HARVEST = 'tax_loss_harvest',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ nullable: true })
  symbol: string;

  @Column('decimal', { precision: 15, scale: 8, nullable: true })
  quantity: number;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  fees: number;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Portfolio, portfolio => portfolio.transactions)
  portfolio: Portfolio;

  @CreateDateColumn()
  executedAt: Date;
}