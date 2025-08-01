import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type RiskAssessmentEntity, RiskLevel, RiskCategory } from "../entities/risk-assessment.entity"
import type { CreateRiskAssessmentDto, UpdateRiskAssessmentDto } from "../dto/risk-assessment.dto"

export interface RiskFactors {
  transactionVolume: number
  accountAge: number
  geographicRisk: number
  behavioralAnomalies: number
  complianceHistory: number
}

@Injectable()
export class RiskAssessmentService {
  private riskAssessmentRepository: Repository<RiskAssessmentEntity>

  constructor(riskAssessmentRepository: Repository<RiskAssessmentEntity>) {
    this.riskAssessmentRepository = riskAssessmentRepository
  }

  async createRiskAssessment(createDto: CreateRiskAssessmentDto): Promise<RiskAssessmentEntity> {
    const assessment = this.riskAssessmentRepository.create({
      ...createDto,
      assessmentDate: new Date(createDto.assessmentDate),
      nextAssessmentDate: createDto.nextAssessmentDate ? new Date(createDto.nextAssessmentDate) : null,
    })
    return await this.riskAssessmentRepository.save(assessment)
  }

  async calculateUserRiskScore(userId: string, riskFactors: RiskFactors): Promise<number> {
    let riskScore = 0

    // Transaction volume risk (0-25 points)
    if (riskFactors.transactionVolume > 100000) riskScore += 25
    else if (riskFactors.transactionVolume > 50000) riskScore += 15
    else if (riskFactors.transactionVolume > 10000) riskScore += 8

    // Account age risk (0-15 points, newer accounts are riskier)
    if (riskFactors.accountAge < 30) riskScore += 15
    else if (riskFactors.accountAge < 90) riskScore += 10
    else if (riskFactors.accountAge < 365) riskScore += 5

    // Geographic risk (0-20 points)
    riskScore += Math.min(riskFactors.geographicRisk * 20, 20)

    // Behavioral anomalies (0-25 points)
    riskScore += Math.min(riskFactors.behavioralAnomalies * 25, 25)

    // Compliance history (0-15 points)
    riskScore += Math.min(riskFactors.complianceHistory * 15, 15)

    return Math.min(riskScore, 100)
  }

  async performComprehensiveRiskAssessment(
    entityId: string,
    entityType: string,
    riskFactors: RiskFactors,
  ): Promise<RiskAssessmentEntity> {
    const riskScore = await this.calculateUserRiskScore(entityId, riskFactors)
    const riskLevel = this.determineRiskLevel(riskScore)
    const mitigationStrategies = this.generateMitigationStrategies(riskLevel, riskFactors)

    const assessment = await this.createRiskAssessment({
      entityId,
      entityType,
      riskCategory: RiskCategory.FINANCIAL,
      riskLevel,
      riskScore,
      riskDescription: this.generateRiskDescription(riskScore, riskFactors),
      riskFactors,
      mitigationStrategies,
      residualRisk: this.calculateResidualRisk(riskScore, mitigationStrategies.length),
      assessmentDate: new Date().toISOString(),
      nextAssessmentDate: this.calculateNextAssessmentDate(riskLevel).toISOString(),
      assessedBy: "system",
    })

    return assessment
  }

  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 80) return RiskLevel.VERY_HIGH
    if (riskScore >= 60) return RiskLevel.HIGH
    if (riskScore >= 40) return RiskLevel.MEDIUM
    if (riskScore >= 20) return RiskLevel.LOW
    return RiskLevel.VERY_LOW
  }

  private generateRiskDescription(riskScore: number, factors: RiskFactors): string {
    const descriptions: string[] = []

    if (factors.transactionVolume > 50000) {
      descriptions.push("High transaction volume detected")
    }

    if (factors.accountAge < 90) {
      descriptions.push("New account with limited history")
    }

    if (factors.geographicRisk > 0.5) {
      descriptions.push("Geographic risk factors present")
    }

    if (factors.behavioralAnomalies > 0.3) {
      descriptions.push("Behavioral anomalies detected")
    }

    if (factors.complianceHistory > 0.2) {
      descriptions.push("Previous compliance issues identified")
    }

    return descriptions.length > 0 ? descriptions.join("; ") : "Standard risk profile with no significant concerns"
  }

  private generateMitigationStrategies(riskLevel: RiskLevel, factors: RiskFactors): string[] {
    const strategies: string[] = []

    switch (riskLevel) {
      case RiskLevel.VERY_HIGH:
        strategies.push("Immediate manual review required")
        strategies.push("Enhanced due diligence procedures")
        strategies.push("Transaction monitoring with low thresholds")
        strategies.push("Senior management approval for high-value transactions")
        break

      case RiskLevel.HIGH:
        strategies.push("Enhanced monitoring and periodic review")
        strategies.push("Additional identity verification")
        strategies.push("Transaction limits implementation")
        break

      case RiskLevel.MEDIUM:
        strategies.push("Regular monitoring and review")
        strategies.push("Periodic compliance checks")
        break

      case RiskLevel.LOW:
        strategies.push("Standard monitoring procedures")
        break

      case RiskLevel.VERY_LOW:
        strategies.push("Minimal monitoring required")
        break
    }

    // Add specific strategies based on risk factors
    if (factors.transactionVolume > 100000) {
      strategies.push("Implement transaction velocity controls")
    }

    if (factors.geographicRisk > 0.7) {
      strategies.push("Enhanced geographic risk monitoring")
    }

    return strategies
  }

  private calculateResidualRisk(originalRisk: number, mitigationCount: number): number {
    const reductionFactor = Math.min(mitigationCount * 0.1, 0.5) // Max 50% reduction
    return Math.max(originalRisk * (1 - reductionFactor), 5) // Minimum 5% residual risk
  }

  private calculateNextAssessmentDate(riskLevel: RiskLevel): Date {
    const now = new Date()
    let daysToAdd: number

    switch (riskLevel) {
      case RiskLevel.VERY_HIGH:
        daysToAdd = 30 // Monthly
        break
      case RiskLevel.HIGH:
        daysToAdd = 90 // Quarterly
        break
      case RiskLevel.MEDIUM:
        daysToAdd = 180 // Semi-annually
        break
      case RiskLevel.LOW:
        daysToAdd = 365 // Annually
        break
      case RiskLevel.VERY_LOW:
        daysToAdd = 730 // Bi-annually
        break
    }

    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
  }

  async getRiskAssessments(entityId?: string): Promise<RiskAssessmentEntity[]> {
    const where = entityId ? { entityId } : {}
    return await this.riskAssessmentRepository.find({
      where,
      order: { assessmentDate: "DESC" },
    })
  }

  async updateRiskAssessment(id: string, updateDto: UpdateRiskAssessmentDto): Promise<RiskAssessmentEntity> {
    const assessment = await this.riskAssessmentRepository.findOne({ where: { id } })
    if (!assessment) {
      throw new NotFoundException(`Risk assessment with ID ${id} not found`)
    }

    Object.assign(assessment, {
      ...updateDto,
      nextAssessmentDate: updateDto.nextAssessmentDate
        ? new Date(updateDto.nextAssessmentDate)
        : assessment.nextAssessmentDate,
    })

    return await this.riskAssessmentRepository.save(assessment)
  }

  async getHighRiskEntities(): Promise<RiskAssessmentEntity[]> {
    return await this.riskAssessmentRepository.find({
      where: [{ riskLevel: RiskLevel.HIGH }, { riskLevel: RiskLevel.VERY_HIGH }],
      order: { riskScore: "DESC" },
    })
  }
}
