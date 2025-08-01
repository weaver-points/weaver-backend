import { DefiIntegrationController } from "./controllers/defi-integration.controller"
import { CompoundStrategy } from "./strategies/compound-strategy"
import { UniswapStrategy } from "./strategies/uniswap-strategy"

export class DefiIntegrationModule {
  private controller: DefiIntegrationController
  private strategies: Map<string, any> = new Map()

  constructor() {
    this.controller = new DefiIntegrationController()
    this.initializeStrategies()
  }

  private initializeStrategies() {
    const compoundStrategy = new CompoundStrategy()
    const uniswapStrategy = new UniswapStrategy()

    this.strategies.set(compoundStrategy.id, compoundStrategy)
    this.strategies.set(uniswapStrategy.id, uniswapStrategy)
  }

  getController(): DefiIntegrationController {
    return this.controller
  }

  getStrategy(strategyId: string) {
    return this.strategies.get(strategyId)
  }

  getAllStrategies() {
    return Array.from(this.strategies.values())
  }

  // Health check endpoint
  async healthCheck(): Promise<any> {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        defiIntegration: "active",
        yieldFarming: "active",
        liquidityManagement: "active",
        portfolioOptimizer: "active",
      },
      supportedProtocols: ["Uniswap V2/V3", "Aave", "Compound", "Curve", "Yearn Finance", "Balancer"],
    }
  }
}

// Export singleton instance
export const defiIntegrationModule = new DefiIntegrationModule()
