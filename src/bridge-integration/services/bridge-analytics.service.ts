import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BridgeLiquidity } from '../entities/bridge-liquidity.entity';
import { BridgeTransaction } from '../entities/bridge-transaction.entity';
import { BridgeAnalyticsDto } from '../dto/bridge-analytics.dto';

@Injectable()
export class BridgeAnalyticsService {
  private readonly logger = new Logger(BridgeAnalyticsService.name);

  constructor(
    @InjectRepository(BridgeTransaction)
    private bridgeTransactionRepository: Repository<BridgeTransaction>,
    @InjectRepository(BridgeLiquidity)
    private bridgeLiquidityRepository: Repository<BridgeLiquidity>,
  ) {}

  async getAnalytics(days: number = 30): Promise<BridgeAnalyticsDto> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const transactions = await this.bridgeTransactionRepository.find({
        where: {
          createdAt: { $gte: startDate } as any,
        },
      });

      const totalTransactions = transactions.length;
      const completedTransactions = transactions.filter(
        (tx) => tx.status === 'COMPLETED',
      );
      const totalVolume = transactions
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
        .toString();

      const successRate =
        totalTransactions > 0
          ? (completedTransactions.length / totalTransactions) * 100
          : 0;

      const averageCompletionTime =
        completedTransactions.length > 0
          ? completedTransactions
              .filter((tx) => tx.completedAt && tx.createdAt)
              .reduce((sum, tx) => {
                const completionTime =
                  tx.completedAt!.getTime() - tx.createdAt.getTime();
                return sum + completionTime;
              }, 0) /
            completedTransactions.length /
            (1000 * 60)
          : 0; // in minutes

      // Protocol breakdown
      const protocolStats = new Map();
      transactions.forEach((tx) => {
        if (!protocolStats.has(tx.bridgeProtocol)) {
          protocolStats.set(tx.bridgeProtocol, {
            protocol: tx.bridgeProtocol,
            transactions: 0,
            volume: 0,
            completed: 0,
          });
        }
        const stats = protocolStats.get(tx.bridgeProtocol);
        stats.transactions++;
        stats.volume += parseFloat(tx.amount);
        if (tx.status === 'COMPLETED') stats.completed++;
      });

      const protocolBreakdown = Array.from(protocolStats.values()).map(
        (stats) => ({
          protocol: stats.protocol,
          transactions: stats.transactions,
          volume: stats.volume.toString(),
          successRate:
            stats.transactions > 0
              ? (stats.completed / stats.transactions) * 100
              : 0,
        }),
      );

      // Chain breakdown
      const chainStats = new Map();
      transactions.forEach((tx) => {
        const key = `${tx.sourceChainId}-${tx.destinationChainId}`;
        if (!chainStats.has(key)) {
          chainStats.set(key, {
            sourceChainId: tx.sourceChainId,
            destinationChainId: tx.destinationChainId,
            transactions: 0,
            volume: 0,
          });
        }
        const stats = chainStats.get(key);
        stats.transactions++;
        stats.volume += parseFloat(tx.amount);
      });

      const chainBreakdown = Array.from(chainStats.values()).map((stats) => ({
        chainId: stats.sourceChainId,
        chainName: this.getChainName(stats.sourceChainId),
        transactions: stats.transactions,
        volume: stats.volume.toString(),
      }));

      // Daily stats
      const dailyStats = this.generateDailyStats(transactions, days);

      return {
        totalTransactions,
        totalVolume,
        successRate: parseFloat(successRate.toFixed(2)),
        averageCompletionTime: parseFloat(averageCompletionTime.toFixed(2)),
        protocolBreakdown,
        chainBreakdown,
        dailyStats,
      };
    } catch (error) {
      this.logger.error('Failed to get analytics', error);
      throw error;
    }
  }

  private getChainName(chainId: number): string {
    const chainNames = {
      1: 'Ethereum',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      43114: 'Avalanche',
      250: 'Fantom',
      100: 'Gnosis',
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }

  private generateDailyStats(transactions: BridgeTransaction[], days: number) {
    const dailyMap = new Map();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyMap.set(dateKey, {
        date: dateKey,
        transactions: 0,
        volume: 0,
        totalFees: 0,
      });
    }

    // Fill with actual data
    transactions.forEach((tx) => {
      const dateKey = tx.createdAt.toISOString().split('T')[0];
      if (dailyMap.has(dateKey)) {
        const stats = dailyMap.get(dateKey);
        stats.transactions++;
        stats.volume += parseFloat(tx.amount);
        stats.totalFees +=
          parseFloat(tx.bridgeFee || '0') + parseFloat(tx.gasFee || '0');
      }
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((stats) => ({
        date: stats.date,
        transactions: stats.transactions,
        volume: stats.volume.toString(),
        averageFee:
          stats.transactions > 0
            ? (stats.totalFees / stats.transactions).toString()
            : '0',
      }));
  }

  async getLiquidityMetrics(): Promise<
    Array<{
      bridgeProtocol: string;
      chainId: number;
      chainName: string;
      totalLiquidity: string;
      availableLiquidity: string;
      utilizationRate: number;
    }>
  > {
    try {
      const liquidityData = await this.bridgeLiquidityRepository.find();

      return liquidityData.map((liquidity) => ({
        bridgeProtocol: liquidity.bridgeProtocol,
        chainId: liquidity.chainId,
        chainName: this.getChainName(liquidity.chainId),
        totalLiquidity: liquidity.totalLiquidity,
        availableLiquidity: liquidity.availableLiquidity,
        utilizationRate: parseFloat(liquidity.utilizationRate),
      }));
    } catch (error) {
      this.logger.error('Failed to get liquidity metrics', error);
      throw error;
    }
  }
}
