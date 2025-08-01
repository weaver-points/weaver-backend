import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export enum RiskLevel {
  VERY_LOW = "very_low",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  VERY_HIGH = "very_high",
}

export enum RiskCategory {
  FINANCIAL = "financial",
  OPERATIONAL = "operational",
  COMPLIANCE = "compliance",
  REPUTATIONAL = "reputational",
  STRATEGIC = "strategic",
  CYBERSECURITY = "cybersecurity",
}

@Entity("risk_assessments")
export class RiskAssessmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  entityId: string

  @Column({ type: "varchar", length: 100 })
  entityType: string

  @Column({ type: "enum", enum: RiskCategory })
  riskCategory: RiskCategory

  @Column({ type: "enum", enum: RiskLevel })
  riskLevel: RiskLevel

  @Column({ type: "decimal", precision: 5, scale: 2 })
  riskScore: number

  @Column({ type: "text" })
  riskDescription: string

  @Column({ type: "json", nullable: true })
  riskFactors: Record<string, any>

  @Column({ type: "json", nullable: true })
  mitigationStrategies: string[]

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  residualRisk: number

  @Column({ type: "date" })
  assessmentDate: Date

  @Column({ type: "date", nullable: true })
  nextAssessmentDate: Date

  @Column({ type: "varchar", length: 255 })
  assessedBy: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
