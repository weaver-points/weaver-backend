import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum NotificationChannel {
  EMAIL = "email",
  PUSH = "push",
  SMS = "sms",
  DISCORD = "discord",
}

export enum NotificationCategory {
  PORTFOLIO = "portfolio",
  MARKET = "market",
  SECURITY = "security",
  SYSTEM = "system",
}

@Entity("notification_preferences")
export class NotificationPreference {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({
    type: "enum",
    enum: NotificationCategory,
  })
  category: NotificationCategory;

  @Column({
    type: "enum",
    enum: NotificationChannel,
    array: true,
  })
  enabledChannels: NotificationChannel[];

  @Column({
    type: "enum",
    enum: NotificationPriority,
  })
  minimumPriority: NotificationPriority;

  @Column({ type: "json", nullable: true })
  filters: Record<string, any>;

  @Column({ type: "json", nullable: true })
  scheduleSettings: {
    quietHours?: { start: string; end: string };
    timezone?: string;
    workdaysOnly?: boolean;
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
