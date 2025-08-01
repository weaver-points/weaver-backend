export interface YieldStrategyDto {
  id: string
  name: string
  description: string
  protocols: string[]
  minAmount: number
  maxAmount: number
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  expectedApy: number
  autoCompound: boolean
}

export interface StrategyExecutionDto {
  strategyId: string
  amount: number
  userAddress: string
  slippage: number
}
