import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type FraudAlertEntity, FraudType, AlertSeverity, AlertStatus } from "../entities/fraud-alert.entity"

export interface TransactionData {
  userId: string
  amount: number
  currency: string
  merchantId?: string
  location?: string
  timestamp: Date
  paymentMethod: string
  metadata?: Record<string, any>
}

export interface FraudDetectionResult {
  isFraudulent: boolean
  confidenceScore: number
  fraudType?: FraudType
  rulesTrigger: string[]
  evidence: Record<string, any>
}

@Injectable()
export class FraudDetectionService {
  private fraudAlertRepository: Repository<FraudAlertEntity>

  constructor(fraudAlertRepository: Repository<FraudAlertEntity>) {
    this.fraudAlertRepository = fraudAlertRepository
  }

  async analyzeTransaction(transactionData: TransactionData): Promise<FraudDetectionResult> {
    const rules = await this.applyFraudRules(transactionData)
    const mlScore = await this.calculateMLScore(transactionData)

    const confidenceScore = this.combineScores(rules.score, mlScore)
    const isFraudulent = confidenceScore > 0.7

    const result: FraudDetectionResult = {
      isFraudulent,
      confidenceScore,
      rulesTrigger: rules.triggeredRules,
      evidence: {
        ruleScore: rules.score,
        mlScore,
        transactionAmount: transactionData.amount,
        location: transactionData.location,
        timestamp: transactionData.timestamp,
      },
    }

    if (isFraudulent) {
      result.fraudType = this.determineFraudType(rules.triggeredRules)
      await this.createFraudAlert(transactionData, result)
    }

    return result
  }

  private async applyFraudRules(data: TransactionData): Promise<{ score: number; triggeredRules: string[] }> {
    const triggeredRules: string[] = []
    let score = 0

    // High amount rule
    if (data.amount > 10000) {
      triggeredRules.push("HIGH_AMOUNT")
      score += 0.3
    }

    // Velocity rule (simplified - would need historical data)
    if (data.amount > 5000) {
      triggeredRules.push("VELOCITY_CHECK")
      score += 0.2
    }

    // Location anomaly (simplified)
    if (data.location && data.location.includes("high-risk")) {
      triggeredRules.push("LOCATION_ANOMALY")
      score += 0.4
    }

    // Time-based rule
    const hour = data.timestamp.getHours()
    if (hour < 6 || hour > 22) {
      triggeredRules.push("OFF_HOURS_TRANSACTION")
      score += 0.1
    }

    return { score: Math.min(score, 1), triggeredRules }
  }

  private async calculateMLScore(data: TransactionData): Promise<number> {
    // Simplified ML scoring - in reality, this would use a trained model
    let score = 0

    // Amount-based scoring
    if (data.amount > 1000) score += 0.1
    if (data.amount > 5000) score += 0.2
    if (data.amount > 10000) score += 0.3

    // Payment method risk
    if (data.paymentMethod === "crypto") score += 0.2
    if (data.paymentMethod === "wire") score += 0.1

    return Math.min(score, 1)
  }

  private combineScores(ruleScore: number, mlScore: number): number {
    return ruleScore * 0.6 + mlScore * 0.4
  }

  private determineFraudType(rules: string[]): FraudType {
    if (rules.includes("HIGH_AMOUNT") || rules.includes("VELOCITY_CHECK")) {
      return FraudType.TRANSACTION_FRAUD
    }
    if (rules.includes("LOCATION_ANOMALY")) {
      return FraudType.ACCOUNT_TAKEOVER
    }
    return FraudType.PAYMENT_FRAUD
  }

  private async createFraudAlert(
    transactionData: TransactionData,
    result: FraudDetectionResult,
  ): Promise<FraudAlertEntity> {
    const alert = this.fraudAlertRepository.create({
      fraudType: result.fraudType,
      severity:
        result.confidenceScore > 0.9
          ? AlertSeverity.CRITICAL
          : result.confidenceScore > 0.8
            ? AlertSeverity.HIGH
            : AlertSeverity.MEDIUM,
      status: AlertStatus.OPEN,
      entityId: transactionData.userId,
      entityType: "transaction",
      description: `Fraudulent transaction detected for user ${transactionData.userId}`,
      confidenceScore: result.confidenceScore,
      evidence: result.evidence,
      rulesTrigger: result.rulesTrigger,
    })

    return await this.fraudAlertRepository.save(alert)
  }

  async getFraudAlerts(status?: AlertStatus): Promise<FraudAlertEntity[]> {
    const where = status ? { status } : {}
    return await this.fraudAlertRepository.find({
      where,
      order: { createdAt: "DESC" },
    })
  }

  async updateFraudAlert(id: string, updates: Partial<FraudAlertEntity>): Promise<FraudAlertEntity> {
    const alert = await this.fraudAlertRepository.findOne({ where: { id } })
    if (!alert) {
      throw new NotFoundException(`Fraud alert with ID ${id} not found`)
    }

    Object.assign(alert, updates)
    return await this.fraudAlertRepository.save(alert)
  }
}
