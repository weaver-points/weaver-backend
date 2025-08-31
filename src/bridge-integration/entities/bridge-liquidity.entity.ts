import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bridge_liquidity')
export class BridgeLiquidity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bridgeProtocol: string;

  @Column()
  chainId: number;

  @Column()
  tokenAddress: string;

  @Column()
  tokenSymbol: string;

  @Column('decimal', { precision: 36, scale: 18 })
  availableLiquidity: string;

  @Column('decimal', { precision: 36, scale: 18 })
  totalLiquidity: string;

  @Column('decimal', { precision: 5, scale: 2 })
  utilizationRate: string;

  @Column('decimal', { precision: 10, scale: 6 })
  currentFeeRate: string;

  @Column({ type: 'timestamp' })
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
