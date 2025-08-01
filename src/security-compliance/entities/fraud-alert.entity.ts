import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum FraudType {
  IDENTITY_THEFT = "identity_theft",
  PAYMENT_FRAUD = "payment_fraud",
  ACCOUNT_TAKEOVER = "account_takeover",
  SYNTHETIC_IDENTITY = "synthetic_identity",
  MONEY_LAUNDERING = "money_laundering",
  TRANSACTION_FRAUD = "transaction_fraud",
}

export enum AlertStatus {
  OPEN = "open",
  INVESTIGATING = "investigating",
  RESOLVED = "resolved",
  FALSE_POSITIVE = "false_positive",
  ESCALATED = "escalated",
}

export enum AlertSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

@Entity("fraud_alerts")
export class FraudAlertEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "enum", enum: FraudType })
  fraudType: FraudType

  @Column({ type: "enum", enum: AlertSeverity })
  severity: AlertSeverity

  @Column({ type: "enum", enum: AlertStatus, default: AlertStatus.OPEN })
  status: AlertStatus

  @Column({ type: "varchar", length: 255 })
  entityId: string

  @Column({ type: "varchar", length: 100 })
  entityType: string

  @Column({ type: "text" })
  description: string

  @Column({ type: "decimal", precision: 5, scale: 2 })
  confidenceScore: number

  @Column({ type: "json", nullable: true })
  evidence: Record<string, any>

  @Column({ type: "json", nullable: true })
  rulesTrigger: string[]

  @Column({ type: "varchar", length: 255, nullable: true })
  assignedTo: string

  @Column({ type: "text", nullable: true })
  investigationNotes: string

  @Column({ type: "timestamp", nullable: true })
  resolvedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
