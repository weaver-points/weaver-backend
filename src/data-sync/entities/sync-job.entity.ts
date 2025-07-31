import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

export enum SyncJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum SyncJobType {
  FULL_SYNC = 'full_sync',
  INCREMENTAL = 'incremental',
  CONFLICT_RESOLUTION = 'conflict_resolution'
}

@Entity('sync_jobs')
export class SyncJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SyncJobType })
  type: SyncJobType;

  @Column({ type: 'enum', enum: SyncJobStatus, default: SyncJobStatus.PENDING })
  status: SyncJobStatus;

  @Column()
  platformId: string;

  @Column()
  dataType: string;

  @Column({ type: 'jsonb', nullable: true })
  syncConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SyncHistoryEntity, history => history.syncJob)
  syncHistory: SyncHistoryEntity[];
}
