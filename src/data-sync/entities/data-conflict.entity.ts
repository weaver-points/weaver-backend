import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ConflictStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  MANUAL_REVIEW = 'manual_review'
}

export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  FIRST_WRITE_WINS = 'first_write_wins',
  MERGE = 'merge',
  MANUAL = 'manual'
}

@Entity('data_conflicts')
export class DataConflictEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  dataId: string;

  @Column()
  dataType: string;

  @Column()
  sourcePlatformId: string;

  @Column()
  targetPlatformId: string;

  @Column({ type: 'jsonb' })
  sourceData: Record<string, any>;

  @Column({ type: 'jsonb' })
  targetData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  resolvedData: Record<string, any>;

  @Column({ type: 'enum', enum: ConflictStatus, default: ConflictStatus.PENDING })
  status: ConflictStatus;

  @Column({ type: 'enum', enum: ConflictResolutionStrategy })
  resolutionStrategy: ConflictResolutionStrategy;

  @Column({ type: 'timestamp' })
  sourceTimestamp: Date;

  @Column({ type: 'timestamp' })
  targetTimestamp: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolvedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}