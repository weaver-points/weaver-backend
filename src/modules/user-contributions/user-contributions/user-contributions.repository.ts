import { Injectable, Logger } from '@nestjs/common';
import {
  UserContribution,
  UserProfile,
  Protocol,
  ContributionFilters,
  LeaderboardEntry,
  ContributionStats,
} from './user-contributions.types';

@Injectable()
export class UserContributionsRepository {
  private readonly logger = new Logger(UserContributionsRepository.name);
  private contributions: Map<string, UserContribution> = new Map();
  private profiles: Map<string, UserProfile> = new Map();
  private protocols: Map<string, Protocol> = new Map();

  async createContribution(contribution: UserContribution): Promise<UserContribution> {
    try {
      this.contributions.set(contribution.id, contribution);
      return contribution;
    } catch (error) {
      this.logger.error(`Failed to create contribution: ${error.message}`);
      throw error;
    }
  }

  async findContributions(
    filters: ContributionFilters,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ contributions: UserContribution[]; total: number }> {
    try {
      let filteredContributions = Array.from(this.contributions.values());

      if (filters.userId) {
        filteredContributions = filteredContributions.filter(
          contribution => contribution.userId === filters.userId,
        );
      }
      if (filters.protocolId) {
        filteredContributions = filteredContributions.filter(
          contribution => contribution.protocolId === filters.protocolId,
        );
      }
      if (filters.contributionType) {
        filteredContributions = filteredContributions.filter(
          contribution => contribution.contributionType === filters.contributionType,
        );
      }

      filteredContributions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedContributions = filteredContributions.slice(start, end);

      return {
        contributions: paginatedContributions,
        total: filteredContributions.length,
      };
    } catch (error) {
      this.logger.error(`Failed to find contributions: ${error.message}`);
      throw error;
    }
  }

  async createProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      this.profiles.set(profile.id, profile);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to create profile: ${error.message}`);
      throw error;
    }
  }

  async findProfileByUserId(userId: string): Promise<UserProfile | null> {
    return Array.from(this.profiles.values()).find(profile => profile.userId === userId) || null;
  }

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      this.profiles.set(profile.id, profile);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  }

  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    const profiles = Array.from(this.profiles.values());
    return profiles
      .map((profile, index) => ({
        rank: index + 1,
        userId: profile.userId,
        username: profile.username,
        address: profile.address,
        totalReputationPoints: profile.totalReputationPoints,
        totalContributions: profile.totalContributions,
        protocolsParticipated: profile.protocolsParticipated.length,
        reputationLevel: profile.reputationLevel,
        avatar: profile.avatar,
      }))
      .sort((a, b) => b.totalReputationPoints - a.totalReputationPoints)
      .slice(0, limit);
  }

  async getContributionStats(userId: string): Promise<ContributionStats> {
    const userContributions = Array.from(this.contributions.values()).filter(
      contribution => contribution.userId === userId,
    );

    const totalContributions = userContributions.length;
    const totalReputationPoints = userContributions.reduce(
      (sum, contribution) => sum + contribution.reputationPoints,
      0,
    );

    const protocolsParticipated = new Set(
      userContributions.map(contribution => contribution.protocolId),
    ).size;

    return {
      totalContributions,
      totalReputationPoints,
      protocolsParticipated,
      averageContributionValue: '0',
      contributionBreakdown: {} as any,
      protocolBreakdown: {},
      timeSeries: [],
    };
  }
} 