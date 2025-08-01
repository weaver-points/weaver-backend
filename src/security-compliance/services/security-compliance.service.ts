import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { SecurityAuditEntity } from "../entities/security-audit.entity"
import type { CreateSecurityAuditDto, UpdateSecurityAuditDto } from "../dto/security-audit.dto"

@Injectable()
export class SecurityComplianceService {
  private securityAuditRepository: Repository<SecurityAuditEntity>

  constructor(securityAuditRepository: Repository<SecurityAuditEntity>) {
    this.securityAuditRepository = securityAuditRepository
  }

  async createSecurityAudit(createDto: CreateSecurityAuditDto): Promise<SecurityAuditEntity> {
    const audit = this.securityAuditRepository.create(createDto)
    return await this.securityAuditRepository.save(audit)
  }

  async findAllSecurityAudits(): Promise<SecurityAuditEntity[]> {
    return await this.securityAuditRepository.find({
      order: { createdAt: "DESC" },
    })
  }

  async findSecurityAuditById(id: string): Promise<SecurityAuditEntity> {
    const audit = await this.securityAuditRepository.findOne({ where: { id } })
    if (!audit) {
      throw new NotFoundException(`Security audit with ID ${id} not found`)
    }
    return audit
  }

  async updateSecurityAudit(id: string, updateDto: UpdateSecurityAuditDto): Promise<SecurityAuditEntity> {
    const audit = await this.findSecurityAuditById(id)
    Object.assign(audit, updateDto)
    return await this.securityAuditRepository.save(audit)
  }

  async deleteSecurityAudit(id: string): Promise<void> {
    const result = await this.securityAuditRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`Security audit with ID ${id} not found`)
    }
  }

  async findAuditsByUser(userId: string): Promise<SecurityAuditEntity[]> {
    return await this.securityAuditRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })
  }

  async findAnomalousAudits(): Promise<SecurityAuditEntity[]> {
    return await this.securityAuditRepository.find({
      where: { isAnomaly: true },
      order: { createdAt: "DESC" },
    })
  }
}
