import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("notification_templates")
export class NotificationTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

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

  @Column()
  subject: string;

  @Column({ type: "text" })
  template: string;

  @Column({ type: "json", nullable: true })
  variables: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
