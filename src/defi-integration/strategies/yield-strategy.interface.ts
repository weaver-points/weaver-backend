export interface YieldStrategy {
  id: string
  name: string
  execute(amount: number, userAddress: string): Promise<any>
  calculateExpectedReturn(amount: number): Promise<number>
  getRiskLevel(): "LOW" | "MEDIUM" | "HIGH"
  getRequiredProtocols(): string[]
}

export abstract class BaseYieldStrategy implements YieldStrategy {
  constructor(
    public id: string,
    public name: string,
  ) {}

  abstract execute(amount: number, userAddress: string): Promise<any>
  abstract calculateExpectedReturn(amount: number): Promise<number>
  abstract getRiskLevel(): "LOW" | "MEDIUM" | "HIGH"
  abstract getRequiredProtocols(): string[]

  protected async checkProtocolHealth(protocol: string): Promise<boolean> {
    // Mock protocol health check
    return Math.random() > 0.1 // 90% uptime
  }
}
