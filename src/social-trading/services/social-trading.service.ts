import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TraderProfile } from '../entities/trader-profile.entity';
import { CopyTrade, CopyTradeStatus } from '../entities/copy-trade.entity';
import {
  PerformanceMetric,
  MetricType,
} from '../entities/performance-metric.entity';
import { CreateTraderProfileDto } from '../dto/create-trader-profile.dto';

export interface TraderRanking {
  trader: TraderProfile;
  rank: number;
  score: number;
}

export interface LeaderboardFilters {
  period?: 'week' | 'month' | 'quarter' | 'year';
  minFollowers?: number;
  maxDrawdown?: number;
  minTrades?: number;
  riskLevel?: string;
}

@Injectable()
export class SocialTradingService {
  constructor(
    @InjectRepository(TraderProfile)
    private traderRepository: Repository<TraderProfile>,
    @InjectRepository(CopyTrade)
    private copyTradeRepository: Repository<CopyTrade>,
    @InjectRepository(PerformanceMetric)
    private metricsRepository: Repository<PerformanceMetric>,
  ) {}

  async createTraderProfile(
    dto: CreateTraderProfileDto,
  ): Promise<TraderProfile> {
    const existingProfile = await this.traderRepository.findOne({
      where: { userId: dto.userId },
    });
    if (existingProfile) {
      throw new BadRequestException(
        'Trader profile already exists for this user',
      );
    }

    const profile = this.traderRepository.create({
      ...dto,
    });

    return this.traderRepository.save(profile);
  }

  async getTraderProfile(id: string): Promise<TraderProfile> {
    const profile = await this.traderRepository.findOne({
      where: { id },
      relations: ['strategies', 'performanceMetrics'],
    });

    if (!profile) {
      throw new NotFoundException('Trader profile not found');
    }

    return profile;
  }

  async getTopTraders(
    filters: LeaderboardFilters = {},
  ): Promise<TraderRanking[]> {
    let query = this.traderRepository
      .createQueryBuilder('trader')
      .where('trader.isActive = :isActive', { isActive: true })
      .andWhere('trader.totalTrades >= :minTrades', {
        minTrades: filters.minTrades || 10,
      });

    if (filters.minFollowers) {
      query = query.andWhere('trader.followersCount >= :minFollowers', {
        minFollowers: filters.minFollowers,
      });
    }

    if (filters.maxDrawdown) {
      query = query.andWhere('trader.maxDrawdown <= :maxDrawdown', {
        maxDrawdown: filters.maxDrawdown,
      });
    }

    const traders = await query
      .orderBy('trader.totalReturn', 'DESC')
      .addOrderBy('trader.sharpeRatio', 'DESC')
      .addOrderBy('trader.followersCount', 'DESC')
      .limit(100)
      .getMany();

    return traders.map((trader, index) => ({
      trader,
      rank: index + 1,
      score: this.calculateTraderScore(trader),
    }));
  }

  async followTrader(followerId: string, traderId: string): Promise<void> {
    const trader = await this.getTraderProfile(traderId);

    const existingFollow = await this.copyTradeRepository.findOne({
      where: { followerId, traderProfileId: traderId },
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this trader');
    }

    trader.followersCount += 1;
    await this.traderRepository.save(trader);
  }

  async unfollowTrader(followerId: string, traderId: string): Promise<void> {
    const copyTrade = await this.copyTradeRepository.findOne({
      where: { followerId, traderProfileId: traderId },
    });

    if (copyTrade) {
      copyTrade.status = CopyTradeStatus.STOPPED;
      await this.copyTradeRepository.save(copyTrade);
    }

    const trader = await this.getTraderProfile(traderId);
    if (trader.followersCount > 0) {
      trader.followersCount -= 1;
      await this.traderRepository.save(trader);
    }
  }

  async getTraderFollowers(traderId: string): Promise<CopyTrade[]> {
    return this.copyTradeRepository.find({
      where: {
        traderProfileId: traderId,
        status: CopyTradeStatus.ACTIVE,
      },
    });
  }

  async searchTraders(
    query: string,
    filters: any = {},
  ): Promise<TraderProfile[]> {
    let searchQuery = this.traderRepository
      .createQueryBuilder('trader')
      .where('trader.isActive = :isActive', { isActive: true })
      .andWhere('(trader.username LIKE :query OR trader.bio LIKE :query)', {
        query: `%${query}%`,
      });

    if (filters.minReturn) {
      searchQuery = searchQuery.andWhere('trader.totalReturn >= :minReturn', {
        minReturn: filters.minReturn,
      });
    }

    if (filters.maxDrawdown) {
      searchQuery = searchQuery.andWhere('trader.maxDrawdown <= :maxDrawdown', {
        maxDrawdown: filters.maxDrawdown,
      });
    }

    return searchQuery
      .orderBy('trader.totalReturn', 'DESC')
      .limit(50)
      .getMany();
  }

  private calculateTraderScore(trader: TraderProfile): number {
    const returnWeight = 0.3;
    const sharpeWeight = 0.25;
    const winRateWeight = 0.2;
    const followersWeight = 0.15;
    const drawdownWeight = 0.1;

    const returnScore = Math.min(trader.totalReturn / 100, 2); // Cap at 200%
    const sharpeScore = Math.min(trader.sharpeRatio / 3, 1); // Cap at 3
    const winRateScore = trader.winRate / 100;
    const followersScore = Math.min(trader.followersCount / 1000, 1); // Cap at 1000
    const drawdownScore = Math.max(0, 1 - trader.maxDrawdown / 50); // Penalty for high drawdown

    return (
      (returnScore * returnWeight +
        sharpeScore * sharpeWeight +
        winRateScore * winRateWeight +
        followersScore * followersWeight +
        drawdownScore * drawdownWeight) *
      100
    );
  }

  async updateTraderPerformance(
    traderId: string,
    metrics: Partial<TraderProfile>,
  ): Promise<void> {
    await this.traderRepository.update(traderId, metrics);
  }
}
