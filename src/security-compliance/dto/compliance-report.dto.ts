import { IsEnum, IsString, IsOptional, IsArray, IsNumber, IsDateString } from "class-validator"
import { ComplianceType, ComplianceStatus } from "../entities/compliance-report.entity"

export class CreateComplianceReportDto {
  @IsEnum(ComplianceType)
  complianceType: ComplianceType

  @IsEnum(ComplianceStatus)
  status: ComplianceStatus

  @IsString()
  entityId: string

  @IsString()
  entityType: string

  @IsString()
  findings: string

  @IsArray()
  @IsOptional()
  violations?: Record<string, any>[]

  @IsArray()
  @IsOptional()
  recommendations?: string[]

  @IsNumber()
  @IsOptional()
  complianceScore?: number

  @IsDateString()
  reportDate: string

  @IsDateString()
  @IsOptional()
  nextReviewDate?: string

  @IsString()
  reviewedBy: string
}

export class UpdateComplianceReportDto {
  @IsEnum(ComplianceStatus)
  @IsOptional()
  status?: ComplianceStatus

  @IsString()
  @IsOptional()
  findings?: string

  @IsArray()
  @IsOptional()
  violations?: Record<string, any>[]

  @IsArray()
  @IsOptional()
  recommendations?: string[]

  @IsNumber()
  @IsOptional()
  complianceScore?: number

  @IsDateString()
  @IsOptional()
  nextReviewDate?: string
}
