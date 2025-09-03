import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bridge_transactions')
export class BridgeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bridgeProtocol: string;

  @Column()
  sourceChainId: number;

  @Column()
  destinationChainId: number;

  @Column()
  sourceTokenAddress: string;

  @Column()
  destinationTokenAddress: string;

  @Column('decimal', { precision: 36, scale: 18 })
  amount: string;

  @Column()
  senderAddress: string;

  @Column()
  recipientAddress: string;

  @Column()
  sourceTxHash: string;

  @Column({ nullable: true })
  destinationTxHash: string;

  @Column({
    type: 'enum',
    enum: ['INITIATED', 'PENDING', 'CONFIRMED', 'COMPLETED', 'FAILED'],
    default: 'INITIATED',
  })
  status: string;

  @Column({ type: 'numeric', nullable: true })
  bridgeFee: string;

  @Column({ type: 'numeric', nullable: true })
  gasFee: string;

  @Column({ type: 'timestamp', nullable: true })
  estimatedCompletionTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
