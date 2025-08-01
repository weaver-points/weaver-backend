import { IsEnum, IsString, IsOptional, IsBoolean, IsObject, IsIP } from "class-validator"
import { AuditEventType, AuditSeverity } from "../entities/security-audit.entity"

export class CreateSecurityAuditDto {
  @IsString()
  userId: string

  @IsEnum(AuditEventType)
  eventType: AuditEventType

  @IsEnum(AuditSeverity)
  @IsOptional()
  severity?: AuditSeverity

  @IsString()
  description: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>

  @IsIP()
  @IsOptional()
  ipAddress?: string

  @IsString()
  @IsOptional()
  userAgent?: string

  @IsString()
  @IsOptional()
  resource?: string

  @IsBoolean()
  @IsOptional()
  isAnomaly?: boolean
}

export class UpdateSecurityAuditDto {
  @IsEnum(AuditSeverity)
  @IsOptional()
  severity?: AuditSeverity

  @IsString()
  @IsOptional()
  description?: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>

  @IsBoolean()
  @IsOptional()
  isAnomaly?: boolean
}
