export type ContributionType = 'TRANSACTION' | 'GOVERNANCE' | 'LIQUIDITY' | 'DEVELOPMENT' | 'COMMUNITY' | 'SECURITY';
export type ProtocolType = 'DEX' | 'LENDING' | 'GAMING' | 'NFT' | 'DEFI' | 'INFRASTRUCTURE';
export type ReputationLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface UserContribution {
  id: string;
  userId: string;
  protocolId: string;
  protocolName: string;
  protocolType: ProtocolType;
  contributionType: ContributionType;
  amount?: string;
  currency?: string;
  description: string;
  transactionHash?: string;
  blockNumber?: number;
  timestamp: Date;
  metadata: {
    gasUsed?: string;
    gasPrice?: string;
    success?: boolean;
    errorMessage?: string;
    [key: string]: any;
  };
  reputationPoints: number;
  verified: boolean;
}

export interface UserProfile {
  id: string;
  userId: string;
  address: string;
  username?: string;
  avatar?: string;
  bio?: string;
  reputationLevel: ReputationLevel;
  totalReputationPoints: number;
  totalContributions: number;
  protocolsParticipated: string[];
  joinDate: Date;
  lastActive: Date;
  metadata: {
    socialLinks?: {
      twitter?: string;
      github?: string;
      discord?: string;
    };
    badges?: string[];
    [key: string]: any;
  };
}

export interface Protocol {
  id: string;
  name: string;
  type: ProtocolType;
  address: string;
  description: string;
  website?: string;
  logo?: string;
  isActive: boolean;
  totalContributors: number;
  totalVolume: string;
  reputationMultiplier: number;
  metadata: {
    category?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export interface ContributionStats {
  totalContributions: number;
  totalReputationPoints: number;
  protocolsParticipated: number;
  averageContributionValue: string;
  contributionBreakdown: {
    [key in ContributionType]: {
      count: number;
      totalValue: string;
      reputationPoints: number;
    };
  };
  protocolBreakdown: {
    [protocolId: string]: {
      name: string;
      contributions: number;
      reputationPoints: number;
      lastContribution: Date;
    };
  };
  timeSeries: {
    date: string;
    contributions: number;
    reputationPoints: number;
    volume: string;
  }[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username?: string;
  address: string;
  totalReputationPoints: number;
  totalContributions: number;
  protocolsParticipated: number;
  reputationLevel: ReputationLevel;
  avatar?: string;
}

export interface ContributionFilters {
  userId?: string;
  protocolId?: string;
  protocolType?: ProtocolType;
  contributionType?: ContributionType;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: string;
  maxAmount?: string;
  verified?: boolean;
  reputationLevel?: ReputationLevel;
}

export interface DashboardData {
  userProfile: UserProfile;
  stats: ContributionStats;
  recentContributions: UserContribution[];
  leaderboardPosition: number;
  achievements: Achievement[];
  recommendations: ProtocolRecommendation[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  criteria: {
    type: string;
    value: number;
    current: number;
  };
}

export interface ProtocolRecommendation {
  protocolId: string;
  protocolName: string;
  protocolType: ProtocolType;
  reason: string;
  confidence: number;
  estimatedReputationGain: number;
}

export interface CrossProtocolAnalytics {
  totalUsers: number;
  totalProtocols: number;
  totalContributions: number;
  totalVolume: string;
  topContributors: LeaderboardEntry[];
  topProtocols: {
    protocolId: string;
    name: string;
    contributors: number;
    volume: string;
    reputationPoints: number;
  }[];
  contributionTrends: {
    date: string;
    contributions: number;
    newUsers: number;
    volume: string;
  }[];
}

export interface ContributionExport {
  userId: string;
  format: 'csv' | 'json';
  dateRange: {
    from: Date;
    to: Date;
  };
  includeMetadata: boolean;
} 