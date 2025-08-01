import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ComplianceReportEntity, ComplianceType, ComplianceStatus } from "../entities/compliance-report.entity"
import type { CreateComplianceReportDto, UpdateComplianceReportDto } from "../dto/compliance-report.dto"

export interface KYCData {
  userId: string
  documentType: string
  documentNumber: string
  fullName: string
  dateOfBirth: Date
  address: string
  verificationStatus: string
}

export interface AMLCheckResult {
  isClean: boolean
  riskScore: number
  watchlistMatches: string[]
  sanctionMatches: string[]
  pepMatches: string[]
}

@Injectable()
export class ComplianceMonitorService {
  private complianceReportRepository: Repository<ComplianceReportEntity>

  constructor(complianceReportRepository: Repository<ComplianceReportEntity>) {
    this.complianceReportRepository = complianceReportRepository
  }

  async createComplianceReport(createDto: CreateComplianceReportDto): Promise<ComplianceReportEntity> {
    const report = this.complianceReportRepository.create({
      ...createDto,
      reportDate: new Date(createDto.reportDate),
      nextReviewDate: createDto.nextReviewDate ? new Date(createDto.nextReviewDate) : null,
    })
    return await this.complianceReportRepository.save(report)
  }

  async performKYCCheck(kycData: KYCData): Promise<ComplianceReportEntity> {
    const findings: string[] = []
    const violations: Record<string, any>[] = []
    let complianceScore = 100

    // Document verification
    if (!kycData.documentNumber || kycData.documentNumber.length < 5) {
      findings.push("Invalid or missing document number")
      violations.push({
        type: "DOCUMENT_VERIFICATION",
        severity: "HIGH",
        description: "Document number is invalid or missing",
      })
      complianceScore -= 30
    }

    // Name verification
    if (!kycData.fullName || kycData.fullName.length < 2) {
      findings.push("Invalid full name provided")
      violations.push({
        type: "NAME_VERIFICATION",
        severity: "HIGH",
        description: "Full name is invalid or missing",
      })
      complianceScore -= 25
    }

    // Age verification
    const age = this.calculateAge(kycData.dateOfBirth)
    if (age < 18) {
      findings.push("User is under minimum age requirement")
      violations.push({
        type: "AGE_VERIFICATION",
        severity: "CRITICAL",
        description: "User does not meet minimum age requirement",
      })
      complianceScore -= 50
    }

    // Address verification
    if (!kycData.address || kycData.address.length < 10) {
      findings.push("Incomplete address information")
      violations.push({
        type: "ADDRESS_VERIFICATION",
        severity: "MEDIUM",
        description: "Address information is incomplete",
      })
      complianceScore -= 15
    }

    const status =
      complianceScore >= 80
        ? ComplianceStatus.COMPLIANT
        : complianceScore >= 60
          ? ComplianceStatus.UNDER_REVIEW
          : ComplianceStatus.NON_COMPLIANT

    const report = await this.createComplianceReport({
      complianceType: ComplianceType.KYC,
      status,
      entityId: kycData.userId,
      entityType: "user",
      findings: findings.join("; "),
      violations,
      recommendations: this.generateKYCRecommendations(violations),
      complianceScore,
      reportDate: new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      reviewedBy: "system",
    })

    return report
  }

  async performAMLCheck(userId: string, transactionHistory: any[]): Promise<AMLCheckResult> {
    let riskScore = 0
    const watchlistMatches: string[] = []
    const sanctionMatches: string[] = []
    const pepMatches: string[] = []

    // Simplified AML checks
    const totalTransactionAmount = transactionHistory.reduce((sum, tx) => sum + tx.amount, 0)

    if (totalTransactionAmount > 100000) {
      riskScore += 30
      watchlistMatches.push("HIGH_VALUE_TRANSACTIONS")
    }

    const highRiskCountries = ["Country1", "Country2"] // Simplified
    const hasHighRiskTransactions = transactionHistory.some((tx) => highRiskCountries.includes(tx.country))

    if (hasHighRiskTransactions) {
      riskScore += 40
      sanctionMatches.push("HIGH_RISK_JURISDICTION")
    }

    // Velocity checks
    const recentTransactions = transactionHistory.filter(
      (tx) => new Date(tx.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000),
    )

    if (recentTransactions.length > 10) {
      riskScore += 25
      watchlistMatches.push("HIGH_VELOCITY_TRANSACTIONS")
    }

    const result: AMLCheckResult = {
      isClean: riskScore < 50,
      riskScore,
      watchlistMatches,
      sanctionMatches,
      pepMatches,
    }

    // Create AML compliance report
    await this.createComplianceReport({
      complianceType: ComplianceType.AML,
      status: result.isClean ? ComplianceStatus.COMPLIANT : ComplianceStatus.NON_COMPLIANT,
      entityId: userId,
      entityType: "user",
      findings: `AML risk score: ${riskScore}. Matches found: ${[...watchlistMatches, ...sanctionMatches, ...pepMatches].join(", ")}`,
      violations: result.isClean
        ? []
        : [
            {
              type: "AML_RISK",
              severity: riskScore > 70 ? "CRITICAL" : "HIGH",
              description: "User flagged for AML risk",
              riskScore,
            },
          ],
      recommendations: result.isClean ? [] : ["Enhanced due diligence required", "Manual review recommended"],
      complianceScore: Math.max(0, 100 - riskScore),
      reportDate: new Date().toISOString(),
      reviewedBy: "system",
    })

    return result
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  private generateKYCRecommendations(violations: Record<string, any>[]): string[] {
    const recommendations: string[] = []

    violations.forEach((violation) => {
      switch (violation.type) {
        case "DOCUMENT_VERIFICATION":
          recommendations.push("Request additional identity documents")
          break
        case "NAME_VERIFICATION":
          recommendations.push("Verify name against official documents")
          break
        case "AGE_VERIFICATION":
          recommendations.push("Reject application - user under minimum age")
          break
        case "ADDRESS_VERIFICATION":
          recommendations.push("Request proof of address documentation")
          break
      }
    })

    return recommendations
  }

  async getComplianceReports(complianceType?: ComplianceType): Promise<ComplianceReportEntity[]> {
    const where = complianceType ? { complianceType } : {}
    return await this.complianceReportRepository.find({
      where,
      order: { createdAt: "DESC" },
    })
  }

  async updateComplianceReport(id: string, updateDto: UpdateComplianceReportDto): Promise<ComplianceReportEntity> {
    const report = await this.complianceReportRepository.findOne({ where: { id } })
    if (!report) {
      throw new NotFoundException(`Compliance report with ID ${id} not found`)
    }

    Object.assign(report, {
      ...updateDto,
      nextReviewDate: updateDto.nextReviewDate ? new Date(updateDto.nextReviewDate) : report.nextReviewDate,
    })

    return await this.complianceReportRepository.save(report)
  }
}
