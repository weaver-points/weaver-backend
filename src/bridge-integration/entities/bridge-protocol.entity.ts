import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bridge_protocols')
export class BridgeProtocol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  displayName: string;

  @Column('json')
  supportedChains: number[];

  @Column('json')
  supportedTokens: Record<string, string[]>;

  @Column('decimal', { precision: 5, scale: 2 })
  securityScore: string;

  @Column('decimal', { precision: 10, scale: 6 })
  averageFeePercentage: string;

  @Column('int')
  averageCompletionTimeMinutes: number;

  @Column()
  isActive: boolean;

  @Column('json')
  configuration: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
