export class BridgeAnalyticsDto {
  totalTransactions: number;
  totalVolume: string;
  successRate: number;
  averageCompletionTime: number;
  protocolBreakdown: Array<{
    protocol: string;
    transactions: number;
    volume: string;
    successRate: number;
  }>;
  chainBreakdown: Array<{
    chainId: number;
    chainName: string;
    transactions: number;
    volume: string;
  }>;
  dailyStats: Array<{
    date: string;
    transactions: number;
    volume: string;
    averageFee: string;
  }>;
}
