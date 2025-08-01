import { type NextRequest, NextResponse } from "next/server"
import { defiIntegrationModule } from "../../../src/defi-integration/defi-integration.module"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  try {
    switch (action) {
      case "health":
        const health = await defiIntegrationModule.healthCheck()
        return NextResponse.json(health)

      case "strategies":
        const strategies = defiIntegrationModule.getAllStrategies()
        return NextResponse.json(
          strategies.map((s) => ({
            id: s.id,
            name: s.name,
            riskLevel: s.getRiskLevel(),
            protocols: s.getRequiredProtocols(),
          })),
        )

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    const controller = defiIntegrationModule.getController()

    // Mock request/response objects for controller methods
    const mockReq = { body, params: body }
    const mockRes = {
      json: (data: any) => NextResponse.json(data),
      status: (code: number) => ({
        json: (data: any) => NextResponse.json(data, { status: code }),
      }),
    }

    switch (action) {
      case "create-position":
        return await controller.createPosition(mockReq, mockRes)

      case "execute-strategy":
        return await controller.executeYieldStrategy(mockReq, mockRes)

      case "rebalance-portfolio":
        return await controller.executeRebalance(mockReq, mockRes)

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
