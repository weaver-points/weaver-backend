import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum EngagementAction {
  OPENED = "opened",
  CLICKED = "clicked",
  DISMISSED = "dismissed",
  CONVERTED = "converted",
}

@Entity("notification_analytics")
@Index(["userId", "createdAt"])
@Index(["category", "createdAt"])
export class NotificationAnalytics {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "notification_id" })
  notificationId: string;

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
  })
  channel: NotificationChannel;

  @Column({
    type: "enum",
    enum: EngagementAction,
  })
  action: EngagementAction;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
