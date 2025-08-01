import { IsEnum, IsString, IsOptional, IsArray, IsNumber, IsDateString } from "class-validator"
import { RiskLevel, RiskCategory } from "../entities/risk-assessment.entity"

export class CreateRiskAssessmentDto {
  @IsString()
  entityId: string

  @IsString()
  entityType: string

  @IsEnum(RiskCategory)
  riskCategory: RiskCategory

  @IsEnum(RiskLevel)
  riskLevel: RiskLevel

  @IsNumber()
  riskScore: number

  @IsString()
  riskDescription: string

  @IsOptional()
  riskFactors?: Record<string, any>

  @IsArray()
  @IsOptional()
  mitigationStrategies?: string[]

  @IsNumber()
  @IsOptional()
  residualRisk?: number

  @IsDateString()
  assessmentDate: string

  @IsDateString()
  @IsOptional()
  nextAssessmentDate?: string

  @IsString()
  assessedBy: string
}

export class UpdateRiskAssessmentDto {
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel

  @IsNumber()
  @IsOptional()
  riskScore?: number

  @IsString()
  @IsOptional()
  riskDescription?: string

  @IsOptional()
  riskFactors?: Record<string, any>

  @IsArray()
  @IsOptional()
  mitigationStrategies?: string[]

  @IsNumber()
  @IsOptional()
  residualRisk?: number

  @IsDateString()
  @IsOptional()
  nextAssessmentDate?: string
}
