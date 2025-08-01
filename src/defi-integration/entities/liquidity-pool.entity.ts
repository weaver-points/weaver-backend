export interface LiquidityPool {
  id: string
  protocol: string
  address: string
  token0: string
  token1: string
  reserve0: number
  reserve1: number
  totalSupply: number
  fee: number
  volume24h: number
}

export class LiquidityPoolEntity implements LiquidityPool {
  constructor(
    public id: string,
    public protocol: string,
    public address: string,
    public token0: string,
    public token1: string,
    public reserve0: number,
    public reserve1: number,
    public totalSupply: number,
    public fee: number,
    public volume24h: number,
  ) {}
}
