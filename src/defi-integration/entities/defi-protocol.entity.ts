export interface DefiProtocol {
  id: string
  name: string
  type: "DEX" | "LENDING" | "YIELD_FARMING" | "STAKING"
  contractAddress: string
  chainId: number
  isActive: boolean
  tvl: number
}

export class DefiProtocolEntity implements DefiProtocol {
  constructor(
    public id: string,
    public name: string,
    public type: "DEX" | "LENDING" | "YIELD_FARMING" | "STAKING",
    public contractAddress: string,
    public chainId: number,
    public isActive: boolean,
    public tvl: number,
  ) {}
}
