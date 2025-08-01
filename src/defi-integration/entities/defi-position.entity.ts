export interface DefiPosition {
  id: string
  protocol: string
  tokenA: string
  tokenB: string
  amount: number
  value: number
  apy: number
  createdAt: Date
  updatedAt: Date
}

export class DefiPositionEntity implements DefiPosition {
  constructor(
    public id: string,
    public protocol: string,
    public tokenA: string,
    public tokenB: string,
    public amount: number,
    public value: number,
    public apy: number,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
