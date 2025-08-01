export interface YieldFarm {
  id: string
  protocol: string
  poolAddress: string
  tokenPair: string
  totalLiquidity: number
  apy: number
  rewards: string[]
  isActive: boolean
}

export class YieldFarmEntity implements YieldFarm {
  constructor(
    public id: string,
    public protocol: string,
    public poolAddress: string,
    public tokenPair: string,
    public totalLiquidity: number,
    public apy: number,
    public rewards: string[],
    public isActive = true,
  ) {}
}
