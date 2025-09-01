import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CopyTrade, CopyTradeStatus } from '../entities/copy-trade.entity';
import { TraderProfile } from '../entities/trader-profile.entity';
import { CreateCopyTradeDto, UpdateCopyTradeDto } from '../dto/copy-trade.dto';
import { RiskManagementService } from './risk-management.service';

export interface TradeSignal {
  traderId: string;
  instrument: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  quantity: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: Date;
}

export interface CopyTradeExecution {
  copyTradeId: string;
  originalSignal: TradeSignal;
  executedQuantity: number;
  executedPrice: number;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  reason?: string;
}

@Injectable()
export class CopyTradingService {
  constructor(
    @InjectRepository(CopyTrade)
    private copyTradeRepository: Repository<CopyTrade>,
    @InjectRepository(TraderProfile)
    private traderRepository: Repository<TraderProfile>,
    private riskManagementService: RiskManagementService,
  ) {}

  async createCopyTrade(
    followerId: string,
    dto: CreateCopyTradeDto,
  ): Promise<CopyTrade> {
    const trader = await this.traderRepository.findOne({
      where: { id: dto.traderProfileId },
    });
    if (!trader) {
      throw new NotFoundException('Trader not found');
    }

    const existingCopyTrade = await this.copyTradeRepository.findOne({
      where: { followerId, traderProfileId: dto.traderProfileId },
    });

    if (
      existingCopyTrade &&
      existingCopyTrade.status === CopyTradeStatus.ACTIVE
    ) {
      throw new BadRequestException('Already copying this trader');
    }

    const copyTrade = this.copyTradeRepository.create({
      followerId,
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    const saved = await this.copyTradeRepository.save(copyTrade);

    // Update trader's followers count and AUM
    trader.followersCount += 1;
    trader.assetsUnderManagement += dto.allocatedAmount;
    await this.traderRepository.save(trader);

    return saved;
  }

  async updateCopyTrade(
    id: string,
    dto: UpdateCopyTradeDto,
  ): Promise<CopyTrade> {
    const copyTrade = await this.copyTradeRepository.findOne({ where: { id } });
    if (!copyTrade) {
      throw new NotFoundException('Copy trade not found');
    }

    Object.assign(copyTrade, dto);
    return this.copyTradeRepository.save(copyTrade);
  }

  async stopCopyTrade(id: string): Promise<void> {
    const copyTrade = await this.copyTradeRepository.findOne({
      where: { id },
      relations: ['traderProfile'],
    });

    if (!copyTrade) {
      throw new NotFoundException('Copy trade not found');
    }

    copyTrade.status = CopyTradeStatus.STOPPED;
    await this.copyTradeRepository.save(copyTrade);

    // Update trader's AUM
    if (copyTrade.traderProfile) {
      copyTrade.traderProfile.assetsUnderManagement -=
        copyTrade.allocatedAmount;
      await this.traderRepository.save(copyTrade.traderProfile);
    }
  }

  async getCopyTrades(followerId: string): Promise<CopyTrade[]> {
    return this.copyTradeRepository.find({
      where: { followerId },
      relations: ['traderProfile'],
      order: { createdAt: 'DESC' },
    });
  }

  async processTradeSignal(signal: TradeSignal): Promise<CopyTradeExecution[]> {
    const activeCopyTrades = await this.copyTradeRepository.find({
      where: {
        traderProfileId: signal.traderId,
        status: CopyTradeStatus.ACTIVE,
      },
    });

    const executions: CopyTradeExecution[] = [];

    for (const copyTrade of activeCopyTrades) {
      try {
        const execution = await this.executeCopyTrade(copyTrade, signal);
        executions.push(execution);

        // Update copy trade metrics
        await this.updateCopyTradeMetrics(copyTrade.id, execution);
      } catch (error) {
        executions.push({
          copyTradeId: copyTrade.id,
          originalSignal: signal,
          executedQuantity: 0,
          executedPrice: 0,
          status: 'FAILED',
          reason: error.message,
        });
      }
    }

    return executions;
  }

  private async executeCopyTrade(
    copyTrade: CopyTrade,
    signal: TradeSignal,
  ): Promise<CopyTradeExecution> {
    // Check if instrument is allowed
    if (
      copyTrade.allowedInstruments &&
      !copyTrade.allowedInstruments.includes(signal.instrument)
    ) {
      throw new Error('Instrument not in allowed list');
    }

    if (
      copyTrade.excludedInstruments &&
      copyTrade.excludedInstruments.includes(signal.instrument)
    ) {
      throw new Error('Instrument is excluded');
    }

    // Apply copy ratio
    const adjustedQuantity = signal.quantity * copyTrade.copyRatio;

    // Risk management checks
    const riskCheck = await this.riskManagementService.validateTrade(
      copyTrade,
      {
        instrument: signal.instrument,
        quantity: adjustedQuantity,
        price: signal.price,
        action: signal.action,
      },
    );

    if (!riskCheck.approved) {
      throw new Error(`Risk check failed: ${riskCheck.reason}`);
    }

    const executedQuantity = Math.min(
      adjustedQuantity,
      riskCheck.maxAllowedQuantity || adjustedQuantity,
    );

    // Simulate trade execution (in real implementation, this would call broker API)
    const executedPrice = signal.price * (1 + (Math.random() - 0.5) * 0.001); // Small slippage simulation

    return {
      copyTradeId: copyTrade.id,
      originalSignal: signal,
      executedQuantity,
      executedPrice,
      status: executedQuantity === adjustedQuantity ? 'SUCCESS' : 'PARTIAL',
    };
  }

  private async updateCopyTradeMetrics(
    copyTradeId: string,
    execution: CopyTradeExecution,
  ): Promise<void> {
    const copyTrade = await this.copyTradeRepository.findOne({
      where: { id: copyTradeId },
    });
    if (!copyTrade) return;

    copyTrade.totalCopiedTrades += 1;

    // Update P&L (simplified calculation)
    if (execution.status === 'SUCCESS' || execution.status === 'PARTIAL') {
      const tradeValue = execution.executedQuantity * execution.executedPrice;
      const direction = execution.originalSignal.action === 'BUY' ? 1 : -1;
      copyTrade.totalPnL += tradeValue * direction * 0.01; // Simplified P&L calculation
    }

    copyTrade.totalReturn =
      (copyTrade.totalPnL / copyTrade.allocatedAmount) * 100;

    await this.copyTradeRepository.save(copyTrade);
  }

  async getCopyTradePerformance(id: string): Promise<any> {
    const copyTrade = await this.copyTradeRepository.findOne({
      where: { id },
      relations: ['traderProfile'],
    });

    if (!copyTrade) {
      throw new NotFoundException('Copy trade not found');
    }

    return {
      id: copyTrade.id,
      trader: copyTrade.traderProfile.username,
      allocatedAmount: copyTrade.allocatedAmount,
      totalReturn: copyTrade.totalReturn,
      totalPnL: copyTrade.totalPnL,
      totalCopiedTrades: copyTrade.totalCopiedTrades,
      status: copyTrade.status,
      startDate: copyTrade.startDate,
      duration: copyTrade.startDate
        ? Math.floor(
            (new Date().getTime() - copyTrade.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
    };
  }
}
