import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum DeliveryStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  BOUNCED = "bounced",
}

@Entity("notification_deliveries")
export class NotificationDelivery {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "notification_id" })
  notificationId: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({
    type: "enum",
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({
    type: "enum",
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  externalId: string;

  @Column({ type: "text", nullable: true })
  errorMessage: string;

  @Column({ type: "timestamp", nullable: true })
  sentAt: Date;

  @Column({ type: "timestamp", nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
