import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BridgeTransaction } from '../entities/bridge-transaction.entity';
import { BridgeIntegrationService } from './bridge-integration.service';

@Injectable()
export class BridgeMonitorService {
  private readonly logger = new Logger(BridgeMonitorService.name);

  constructor(
    @InjectRepository(BridgeTransaction)
    private bridgeTransactionRepository: Repository<BridgeTransaction>,
    private bridgeIntegrationService: BridgeIntegrationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorPendingTransactions() {
    try {
      const pendingTransactions = await this.bridgeTransactionRepository.find({
        where: [
          { status: 'INITIATED' },
          { status: 'PENDING' },
          { status: 'CONFIRMED' },
        ],
      });

      for (const transaction of pendingTransactions) {
        try {
          const status = { status: 'INITIATED' };
          await this.bridgeIntegrationService.getTransactionStatus(
            transaction.id,
          );

          if (status.status !== transaction.status) {
            this.logger.log(
              `Transaction ${transaction.id} status updated from ${transaction.status} to ${status.status}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to update transaction ${transaction.id}`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to monitor pending transactions', error);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkStaleTransactions() {
    try {
      const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      const staleTransactions = await this.bridgeTransactionRepository.find({
        where: [
          { status: 'INITIATED', createdAt: { $lt: staleTime } as any },
          { status: 'PENDING', createdAt: { $lt: staleTime } as any },
        ],
      });

      for (const transaction of staleTransactions) {
        this.logger.warn(
          `Stale transaction detected: ${transaction.id}, created: ${transaction.createdAt}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to check stale transactions', error);
    }
  }

  async getTransactionMetrics() {
    try {
      const totalTransactions = await this.bridgeTransactionRepository.count();
      const completedTransactions =
        await this.bridgeTransactionRepository.count({
          where: { status: 'COMPLETED' },
        });
      const failedTransactions = await this.bridgeTransactionRepository.count({
        where: { status: 'FAILED' },
      });

      const successRate =
        totalTransactions > 0
          ? (completedTransactions / totalTransactions) * 100
          : 0;

      return {
        totalTransactions,
        completedTransactions,
        failedTransactions,
        successRate: parseFloat(successRate.toFixed(2)),
      };
    } catch (error) {
      this.logger.error('Failed to get transaction metrics', error);
      throw error;
    }
  }
}
