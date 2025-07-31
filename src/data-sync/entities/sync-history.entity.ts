import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MERGE = 'merge'
}

@Entity('sync_history')
export class SyncHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  syncJobId: string;

  @Column()
  dataId: string;

  @Column()
  dataType: string;

  @Column({ type: 'enum', enum: SyncOperation })
  operation: SyncOperation;

  @Column()
  platformId: string;

  @Column({ type: 'jsonb', nullable: true })
  beforeData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  afterData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'bigint' })
  version: number;

  @Column()
  checksum: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => SyncJobEntity, syncJob => syncJob.syncHistory)
  @JoinColumn({ name: 'syncJobId' })
  syncJob: SyncJobEntity;
}