import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum ComplianceType {
  KYC = "kyc",
  AML = "aml",
  GDPR = "gdpr",
  PCI_DSS = "pci_dss",
  SOX = "sox",
  HIPAA = "hipaa",
}

export enum ComplianceStatus {
  COMPLIANT = "compliant",
  NON_COMPLIANT = "non_compliant",
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
}

@Entity("compliance_reports")
export class ComplianceReportEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "enum", enum: ComplianceType })
  complianceType: ComplianceType

  @Column({ type: "enum", enum: ComplianceStatus })
  status: ComplianceStatus

  @Column({ type: "varchar", length: 255 })
  entityId: string

  @Column({ type: "varchar", length: 100 })
  entityType: string

  @Column({ type: "text" })
  findings: string

  @Column({ type: "json", nullable: true })
  violations: Record<string, any>[]

  @Column({ type: "json", nullable: true })
  recommendations: string[]

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  complianceScore: number

  @Column({ type: "date" })
  reportDate: Date

  @Column({ type: "date", nullable: true })
  nextReviewDate: Date

  @Column({ type: "varchar", length: 255 })
  reviewedBy: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
