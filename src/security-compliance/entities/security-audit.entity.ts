import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum AuditEventType {
  LOGIN = "login",
  LOGOUT = "logout",
  TRANSACTION = "transaction",
  DATA_ACCESS = "data_access",
  SYSTEM_CHANGE = "system_change",
  SECURITY_VIOLATION = "security_violation",
}

export enum AuditSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

@Entity("security_audits")
export class SecurityAuditEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  userId: string

  @Column({ type: "enum", enum: AuditEventType })
  eventType: AuditEventType

  @Column({ type: "enum", enum: AuditSeverity, default: AuditSeverity.LOW })
  severity: AuditSeverity

  @Column({ type: "text" })
  description: string

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string

  @Column({ type: "varchar", length: 500, nullable: true })
  userAgent: string

  @Column({ type: "varchar", length: 255, nullable: true })
  resource: string

  @Column({ type: "boolean", default: false })
  isAnomaly: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
