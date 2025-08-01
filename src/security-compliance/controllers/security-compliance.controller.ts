import { Controller, Get, Post, Put, Delete, HttpStatus, HttpCode } from "@nestjs/common"
import type { SecurityComplianceService } from "../services/security-compliance.service"
import type { FraudDetectionService, TransactionData } from "../services/fraud-detection.service"
import type { ComplianceMonitorService, KYCData } from "../services/compliance-monitor.service"
import type { RiskAssessmentService, RiskFactors } from "../services/risk-assessment.service"
import type { TransactionMonitor } from "../monitors/transaction-monitor"
import type { FraudDetector, UserBehaviorData } from "../monitors/fraud-detector"
import type { ComplianceChecker } from "../monitors/compliance-checker"
import type { CreateSecurityAuditDto, UpdateSecurityAuditDto } from "../dto/security-audit.dto"
import type { CreateComplianceReportDto, UpdateComplianceReportDto } from "../dto/compliance-report.dto"
import type { CreateRiskAssessmentDto, UpdateRiskAssessmentDto } from "../dto/risk-assessment.dto"
import { type ComplianceType, ComplianceStatus } from "../entities/compliance-report.entity"
import { AlertStatus } from "../entities/fraud-alert.entity"

@Controller("security-compliance")
export class SecurityComplianceController {
  constructor(
    private securityComplianceService: SecurityComplianceService,
    private fraudDetectionService: FraudDetectionService,
    private complianceMonitorService: ComplianceMonitorService,
    private riskAssessmentService: RiskAssessmentService,
    private transactionMonitor: TransactionMonitor,
    private fraudDetector: FraudDetector,
    private complianceChecker: ComplianceChecker,
  ) {}

  // Security Audit Endpoints
  @Post("audits")
  @HttpCode(HttpStatus.CREATED)
  async createSecurityAudit(createDto: CreateSecurityAuditDto) {
    return await this.securityComplianceService.createSecurityAudit(createDto)
  }

  @Get("audits")
  async getAllSecurityAudits() {
    return await this.securityComplianceService.findAllSecurityAudits()
  }

  @Get("audits/:id")
  async getSecurityAuditById(id: string) {
    return await this.securityComplianceService.findSecurityAuditById(id)
  }

  @Put("audits/:id")
  async updateSecurityAudit(id: string, updateDto: UpdateSecurityAuditDto) {
    return await this.securityComplianceService.updateSecurityAudit(id, updateDto)
  }

  @Delete("audits/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSecurityAudit(id: string) {
    await this.securityComplianceService.deleteSecurityAudit(id)
  }

  @Get("audits/user/:userId")
  async getAuditsByUser(userId: string) {
    return await this.securityComplianceService.findAuditsByUser(userId)
  }

  @Get("audits/anomalies")
  async getAnomalousAudits() {
    return await this.securityComplianceService.findAnomalousAudits()
  }

  // Fraud Detection Endpoints
  @Post("fraud/analyze-transaction")
  async analyzeTransaction(transactionData: TransactionData) {
    return await this.fraudDetectionService.analyzeTransaction(transactionData)
  }

  @Get("fraud/alerts")
  async getFraudAlerts(status?: AlertStatus) {
    return await this.fraudDetectionService.getFraudAlerts(status)
  }

  @Put("fraud/alerts/:id")
  async updateFraudAlert(id: string, updates: any) {
    return await this.fraudDetectionService.updateFraudAlert(id, updates)
  }

  @Post("fraud/detect-behavior")
  async detectBehavioralAnomalies(behaviorData: UserBehaviorData) {
    return await this.fraudDetector.detectBehavioralAnomalies(behaviorData)
  }

  @Post("fraud/detect-takeover")
  async detectAccountTakeover(data: {
    userId: string
    currentSession: any
    historicalSessions: any[]
  }) {
    return await this.fraudDetector.detectAccountTakeover(data.userId, data.currentSession, data.historicalSessions)
  }

  @Post("fraud/detect-synthetic")
  async detectSyntheticIdentity(userProfile: any) {
    return await this.fraudDetector.detectSyntheticIdentity(userProfile)
  }

  // Compliance Monitoring Endpoints
  @Post("compliance/reports")
  @HttpCode(HttpStatus.CREATED)
  async createComplianceReport(createDto: CreateComplianceReportDto) {
    return await this.complianceMonitorService.createComplianceReport(createDto)
  }

  @Get("compliance/reports")
  async getComplianceReports(complianceType?: ComplianceType) {
    return await this.complianceMonitorService.getComplianceReports(complianceType)
  }

  @Put("compliance/reports/:id")
  async updateComplianceReport(id: string, updateDto: UpdateComplianceReportDto) {
    return await this.complianceMonitorService.updateComplianceReport(id, updateDto)
  }

  @Post("compliance/kyc-check")
  async performKYCCheck(kycData: KYCData) {
    return await this.complianceMonitorService.performKYCCheck(kycData)
  }

  @Post("compliance/aml-check")
  async performAMLCheck(data: {
    userId: string
    transactionHistory: any[]
  }) {
    return await this.complianceMonitorService.performAMLCheck(data.userId, data.transactionHistory)
  }

  @Post("compliance/scheduled-check/:userId")
  async performScheduledComplianceCheck(userId: string) {
    await this.complianceChecker.performScheduledComplianceCheck(userId)
    return { message: "Compliance check initiated" }
  }

  @Get("compliance/report/:type")
  async generateComplianceReport(complianceType: ComplianceType, startDate: string, endDate: string) {
    return await this.complianceChecker.generateComplianceReport(complianceType, new Date(startDate), new Date(endDate))
  }

  // Risk Assessment Endpoints
  @Post("risk/assessments")
  @HttpCode(HttpStatus.CREATED)
  async createRiskAssessment(createDto: CreateRiskAssessmentDto) {
    return await this.riskAssessmentService.createRiskAssessment(createDto)
  }

  @Get("risk/assessments")
  async getRiskAssessments(entityId?: string) {
    return await this.riskAssessmentService.getRiskAssessments(entityId)
  }

  @Put("risk/assessments/:id")
  async updateRiskAssessment(id: string, updateDto: UpdateRiskAssessmentDto) {
    return await this.riskAssessmentService.updateRiskAssessment(id, updateDto)
  }

  @Post("risk/calculate-score")
  async calculateUserRiskScore(data: {
    userId: string
    riskFactors: RiskFactors
  }) {
    return {
      userId: data.userId,
      riskScore: await this.riskAssessmentService.calculateUserRiskScore(data.userId, data.riskFactors),
    }
  }

  @Post("risk/comprehensive-assessment")
  async performComprehensiveRiskAssessment(data: {
    entityId: string
    entityType: string
    riskFactors: RiskFactors
  }) {
    return await this.riskAssessmentService.performComprehensiveRiskAssessment(
      data.entityId,
      data.entityType,
      data.riskFactors,
    )
  }

  @Get("risk/high-risk-entities")
  async getHighRiskEntities() {
    return await this.riskAssessmentService.getHighRiskEntities()
  }

  // Transaction Monitoring Endpoints
  @Post("monitor/transaction")
  async monitorTransaction(transactionData: TransactionData) {
    await this.transactionMonitor.monitorTransaction(transactionData)
    return { message: "Transaction monitoring completed" }
  }

  @Get("monitor/transaction-stats/:userId")
  async getTransactionStats(userId: string, timeframe: "day" | "week" | "month" = "day") {
    return await this.transactionMonitor.getTransactionStats(userId, timeframe)
  }

  // System Health and Monitoring
  @Get("health")
  async getSystemHealth() {
    return {
      status: "healthy",
      timestamp: new Date(),
      services: {
        fraudDetection: "operational",
        complianceMonitoring: "operational",
        riskAssessment: "operational",
        auditLogging: "operational",
      },
    }
  }

  @Get("dashboard/summary")
  async getDashboardSummary() {
    const [totalAudits, anomalousAudits, fraudAlerts, complianceReports, highRiskEntities] = await Promise.all([
      this.securityComplianceService.findAllSecurityAudits(),
      this.securityComplianceService.findAnomalousAudits(),
      this.fraudDetectionService.getFraudAlerts(),
      this.complianceMonitorService.getComplianceReports(),
      this.riskAssessmentService.getHighRiskEntities(),
    ])

    return {
      summary: {
        totalAudits: totalAudits.length,
        anomalousAudits: anomalousAudits.length,
        openFraudAlerts: fraudAlerts.filter((alert) => alert.status === AlertStatus.OPEN).length,
        totalComplianceReports: complianceReports.length,
        nonCompliantReports: complianceReports.filter((report) => report.status === ComplianceStatus.NON_COMPLIANT)
          .length,
        highRiskEntities: highRiskEntities.length,
      },
      recentActivity: {
        recentAudits: totalAudits.slice(0, 10),
        recentFraudAlerts: fraudAlerts.slice(0, 5),
        recentComplianceReports: complianceReports.slice(0, 5),
      },
    }
  }
}
