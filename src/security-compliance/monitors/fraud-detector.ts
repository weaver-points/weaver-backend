import { Injectable, Logger } from "@nestjs/common"
import type { FraudDetectionService } from "../services/fraud-detection.service"
import type { SecurityComplianceService } from "../services/security-compliance.service"
import { AuditEventType, AuditSeverity } from "../entities/security-audit.entity"

export interface UserBehaviorData {
  userId: string
  loginFrequency: number
  deviceFingerprint: string
  ipAddress: string
  location: string
  sessionDuration: number
  failedLoginAttempts: number
}

@Injectable()
export class FraudDetector {
  private readonly logger = new Logger(FraudDetector.name)

  constructor(
    private fraudDetectionService: FraudDetectionService,
    private securityComplianceService: SecurityComplianceService,
  ) {}

  async detectBehavioralAnomalies(behaviorData: UserBehaviorData): Promise<boolean> {
    try {
      this.logger.log(`Analyzing behavioral patterns for user: ${behaviorData.userId}`)

      let anomalyScore = 0
      const anomalies: string[] = []

      // Check for unusual login frequency
      if (behaviorData.loginFrequency > 50) {
        // More than 50 logins per day
        anomalyScore += 0.3
        anomalies.push("HIGH_LOGIN_FREQUENCY")
      }

      // Check for failed login attempts
      if (behaviorData.failedLoginAttempts > 5) {
        anomalyScore += 0.4
        anomalies.push("MULTIPLE_FAILED_LOGINS")
      }

      // Check for unusual session duration
      if (behaviorData.sessionDuration < 60 || behaviorData.sessionDuration > 14400) {
        // Less than 1 min or more than 4 hours
        anomalyScore += 0.2
        anomalies.push("UNUSUAL_SESSION_DURATION")
      }

      // Check for location anomalies (simplified)
      if (behaviorData.location.includes("high-risk")) {
        anomalyScore += 0.3
        anomalies.push("HIGH_RISK_LOCATION")
      }

      const isAnomalous = anomalyScore > 0.5

      if (isAnomalous) {
        await this.securityComplianceService.createSecurityAudit({
          userId: behaviorData.userId,
          eventType: AuditEventType.SECURITY_VIOLATION,
          severity: anomalyScore > 0.8 ? AuditSeverity.CRITICAL : AuditSeverity.HIGH,
          description: `Behavioral anomalies detected: ${anomalies.join(", ")}`,
          metadata: {
            anomalyScore,
            anomalies,
            behaviorData,
          },
          ipAddress: behaviorData.ipAddress,
          isAnomaly: true,
        })

        this.logger.warn(`Behavioral anomalies detected for user ${behaviorData.userId}: ${anomalies.join(", ")}`)
      }

      return isAnomalous
    } catch (error) {
      this.logger.error(`Error detecting behavioral anomalies: ${error.message}`, error.stack)
      return false
    }
  }

  async detectAccountTakeover(userId: string, currentSession: any, historicalSessions: any[]): Promise<boolean> {
    try {
      let takeoverScore = 0
      const indicators: string[] = []

      // Device fingerprint analysis
      const knownDevices = historicalSessions.map((s) => s.deviceFingerprint)
      if (!knownDevices.includes(currentSession.deviceFingerprint)) {
        takeoverScore += 0.3
        indicators.push("NEW_DEVICE")
      }

      // Location analysis
      const knownLocations = historicalSessions.map((s) => s.location)
      if (!knownLocations.includes(currentSession.location)) {
        takeoverScore += 0.2
        indicators.push("NEW_LOCATION")
      }

      // Time-based analysis
      const currentHour = new Date().getHours()
      const typicalHours = historicalSessions.map((s) => new Date(s.timestamp).getHours())
      const isTypicalTime = typicalHours.some((hour) => Math.abs(hour - currentHour) <= 2)

      if (!isTypicalTime) {
        takeoverScore += 0.1
        indicators.push("UNUSUAL_TIME")
      }

      // Rapid successive logins from different locations
      if (currentSession.rapidLocationChange) {
        takeoverScore += 0.4
        indicators.push("RAPID_LOCATION_CHANGE")
      }

      const isTakeover = takeoverScore > 0.6

      if (isTakeover) {
        await this.securityComplianceService.createSecurityAudit({
          userId,
          eventType: AuditEventType.SECURITY_VIOLATION,
          severity: AuditSeverity.CRITICAL,
          description: `Potential account takeover detected: ${indicators.join(", ")}`,
          metadata: {
            takeoverScore,
            indicators,
            currentSession,
            suspiciousActivity: true,
          },
          ipAddress: currentSession.ipAddress,
          isAnomaly: true,
        })

        this.logger.error(`Potential account takeover detected for user ${userId}: ${indicators.join(", ")}`)
      }

      return isTakeover
    } catch (error) {
      this.logger.error(`Error detecting account takeover: ${error.message}`, error.stack)
      return false
    }
  }

  async detectSyntheticIdentity(userProfile: any): Promise<boolean> {
    try {
      let syntheticScore = 0
      const indicators: string[] = []

      // Check for inconsistent personal information
      if (this.hasInconsistentPersonalInfo(userProfile)) {
        syntheticScore += 0.4
        indicators.push("INCONSISTENT_PERSONAL_INFO")
      }

      // Check for new credit profile with high activity
      if (userProfile.creditAge < 6 && userProfile.transactionVolume > 10000) {
        syntheticScore += 0.3
        indicators.push("NEW_PROFILE_HIGH_ACTIVITY")
      }

      // Check for unusual contact information patterns
      if (this.hasUnusualContactPatterns(userProfile)) {
        syntheticScore += 0.2
        indicators.push("UNUSUAL_CONTACT_PATTERNS")
      }

      // Check for velocity of account creation
      if (userProfile.accountCreationVelocity > 3) {
        // More than 3 accounts in short time
        syntheticScore += 0.3
        indicators.push("HIGH_ACCOUNT_VELOCITY")
      }

      const isSynthetic = syntheticScore > 0.7

      if (isSynthetic) {
        await this.securityComplianceService.createSecurityAudit({
          userId: userProfile.userId,
          eventType: AuditEventType.SECURITY_VIOLATION,
          severity: AuditSeverity.HIGH,
          description: `Potential synthetic identity detected: ${indicators.join(", ")}`,
          metadata: {
            syntheticScore,
            indicators,
            userProfile,
          },
          isAnomaly: true,
        })

        this.logger.warn(
          `Potential synthetic identity detected for user ${userProfile.userId}: ${indicators.join(", ")}`,
        )
      }

      return isSynthetic
    } catch (error) {
      this.logger.error(`Error detecting synthetic identity: ${error.message}`, error.stack)
      return false
    }
  }

  private hasInconsistentPersonalInfo(profile: any): boolean {
    // Simplified logic - in reality, would use more sophisticated checks
    return !profile.firstName || !profile.lastName || !profile.dateOfBirth || !profile.ssn
  }

  private hasUnusualContactPatterns(profile: any): boolean {
    // Check for patterns like sequential phone numbers, temporary email domains, etc.
    const tempEmailDomains = ["tempmail.com", "10minutemail.com", "guerrillamail.com"]
    const hasTempEmail = tempEmailDomains.some((domain) => profile.email?.includes(domain))

    return hasTempEmail || !profile.phoneNumber || profile.phoneNumber.length < 10
  }
}
