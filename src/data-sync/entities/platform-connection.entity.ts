import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PlatformType {
  MOBILE_APP = 'mobile_app',
  WEB_APP = 'web_app',
  THIRD_PARTY_API = 'third_party_api',
  DATABASE = 'database'
}

export enum ConnectionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

@Entity('platform_connections')
export class PlatformConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: PlatformType })
  type: PlatformType;

  @Column({ type: 'enum', enum: ConnectionStatus, default: ConnectionStatus.ACTIVE })
  status: ConnectionStatus;

  @Column({ type: 'jsonb' })
  connectionConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  authConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  syncSettings: Record<string, any>;

  @Column({ type: 'int', default: 100 })
  rateLimitPerMinute: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastHealthCheckAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}