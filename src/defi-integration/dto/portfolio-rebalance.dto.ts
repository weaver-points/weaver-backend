export interface PortfolioRebalanceDto {
  userAddress: string
  targetAllocations: {
    protocol: string
    percentage: number
  }[]
  rebalanceThreshold: number
  maxSlippage: number
}

export interface RebalanceRecommendation {
  protocol: string
  currentAllocation: number
  targetAllocation: number
  action: "BUY" | "SELL" | "HOLD"
  amount: number
  reason: string
}
