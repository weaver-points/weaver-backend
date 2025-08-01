import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { SecurityComplianceController } from "./controllers/security-compliance.controller"
import { SecurityComplianceService } from "./services/security-compliance.service"
import { FraudDetectionService } from "./services/fraud-detection.service"
import { ComplianceMonitorService } from "./services/compliance-monitor.service"
import { RiskAssessmentService } from "./services/risk-assessment.service"
import { TransactionMonitor } from "./monitors/transaction-monitor"
import { FraudDetector } from "./monitors/fraud-detector"
import { ComplianceChecker } from "./monitors/compliance-checker"
import { SecurityAuditEntity } from "./entities/security-audit.entity"
import { ComplianceReportEntity } from "./entities/compliance-report.entity"
import { RiskAssessmentEntity } from "./entities/risk-assessment.entity"
import { FraudAlertEntity } from "./entities/fraud-alert.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityAuditEntity, ComplianceReportEntity, RiskAssessmentEntity, FraudAlertEntity]),
  ],
  controllers: [SecurityComplianceController],
  providers: [
    SecurityComplianceService,
    FraudDetectionService,
    ComplianceMonitorService,
    RiskAssessmentService,
    TransactionMonitor,
    FraudDetector,
    ComplianceChecker,
  ],
  exports: [SecurityComplianceService, FraudDetectionService, ComplianceMonitorService, RiskAssessmentService],
})
export class SecurityComplianceModule {}
