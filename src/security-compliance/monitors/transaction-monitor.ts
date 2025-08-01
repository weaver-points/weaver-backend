import { Injectable, Logger } from "@nestjs/common"
import type { FraudDetectionService, TransactionData } from "../services/fraud-detection.service"
import type { SecurityComplianceService } from "../services/security-compliance.service"
import { AuditEventType, AuditSeverity } from "../entities/security-audit.entity"

@Injectable()
export class TransactionMonitor {
  private readonly logger = new Logger(TransactionMonitor.name)

  constructor(
    private fraudDetectionService: FraudDetectionService,
    private securityComplianceService: SecurityComplianceService,
  ) {}

  async monitorTransaction(transactionData: TransactionData): Promise<void> {
    try {
      this.logger.log(`Monitoring transaction for user: ${transactionData.userId}`)

      // Log transaction audit
      await this.securityComplianceService.createSecurityAudit({
        userId: transactionData.userId,
        eventType: AuditEventType.TRANSACTION,
        severity: AuditSeverity.LOW,
        description: `Transaction processed: ${transactionData.amount} ${transactionData.currency}`,
        metadata: {
          amount: transactionData.amount,
          currency: transactionData.currency,
          merchantId: transactionData.merchantId,
          paymentMethod: transactionData.paymentMethod,
        },
      })

      // Perform fraud detection
      const fraudResult = await this.fraudDetectionService.analyzeTransaction(transactionData)

      if (fraudResult.isFraudulent) {
        this.logger.warn(`Fraudulent transaction detected for user: ${transactionData.userId}`)

        // Log high-severity audit for fraudulent transaction
        await this.securityComplianceService.createSecurityAudit({
          userId: transactionData.userId,
          eventType: AuditEventType.SECURITY_VIOLATION,
          severity: AuditSeverity.HIGH,
          description: `Fraudulent transaction detected with confidence: ${fraudResult.confidenceScore}`,
          metadata: {
            fraudType: fraudResult.fraudType,
            confidenceScore: fraudResult.confidenceScore,
            rulesTrigger: fraudResult.rulesTrigger,
            evidence: fraudResult.evidence,
          },
          isAnomaly: true,
        })
      }

      // Check for velocity violations
      await this.checkTransactionVelocity(transactionData)

      // Check for amount thresholds
      await this.checkAmountThresholds(transactionData)
    } catch (error) {
      this.logger.error(`Error monitoring transaction: ${error.message}`, error.stack)
    }
  }

  private async checkTransactionVelocity(transactionData: TransactionData): Promise<void> {
    // Simplified velocity check - in reality, would query historical transactions
    const isHighVelocity = transactionData.amount > 5000 // Simplified logic

    if (isHighVelocity) {
      await this.securityComplianceService.createSecurityAudit({
        userId: transactionData.userId,
        eventType: AuditEventType.SECURITY_VIOLATION,
        severity: AuditSeverity.MEDIUM,
        description: "High velocity transaction detected",
        metadata: {
          amount: transactionData.amount,
          velocityCheck: true,
        },
        isAnomaly: true,
      })
    }
  }

  private async checkAmountThresholds(transactionData: TransactionData): Promise<void> {
    const thresholds = {
      reporting: 10000,
      suspicious: 50000,
      critical: 100000,
    }

    let severity = AuditSeverity.LOW
    let description = "Standard transaction processed"

    if (transactionData.amount >= thresholds.critical) {
      severity = AuditSeverity.CRITICAL
      description = "Critical amount threshold exceeded"
    } else if (transactionData.amount >= thresholds.suspicious) {
      severity = AuditSeverity.HIGH
      description = "Suspicious amount threshold exceeded"
    } else if (transactionData.amount >= thresholds.reporting) {
      severity = AuditSeverity.MEDIUM
      description = "Reporting threshold exceeded"
    }

    if (transactionData.amount >= thresholds.reporting) {
      await this.securityComplianceService.createSecurityAudit({
        userId: transactionData.userId,
        eventType: AuditEventType.TRANSACTION,
        severity,
        description,
        metadata: {
          amount: transactionData.amount,
          threshold:
            transactionData.amount >= thresholds.critical
              ? "critical"
              : transactionData.amount >= thresholds.suspicious
                ? "suspicious"
                : "reporting",
        },
        isAnomaly: transactionData.amount >= thresholds.suspicious,
      })
    }
  }

  async getTransactionStats(userId: string, timeframe: "day" | "week" | "month" = "day"): Promise<any> {
    // This would typically query a database for transaction statistics
    // For now, returning mock data structure
    return {
      userId,
      timeframe,
      totalTransactions: 0,
      totalAmount: 0,
      averageAmount: 0,
      flaggedTransactions: 0,
      riskScore: 0,
    }
  }
}
