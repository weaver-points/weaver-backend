import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BridgeIntegrationController } from './controllers/bridge-integration.controller';
import { BridgeAnalyticsService } from './services/bridge-analytics.service';
import { BridgeIntegrationService } from './services/bridge-integration.service';
import { BridgeMonitorService } from './services/bridge-monitor.service';

import { BridgeTransaction } from './entities/bridge-transaction.entity';
import { BridgeLiquidity } from './entities/bridge-liquidity.entity';
import { BridgeProtocol } from './entities/bridge-protocol.entity';

import { StargateBridgeAdapter } from './adapters/stargate-bridge.adapter';
import { HopBridgeAdapter } from './adapters/hop-bridge.adapter';
import { AcrossBridgeAdapter } from './adapters/across-bridge.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BridgeTransaction,
      BridgeLiquidity,
      BridgeProtocol,
    ]),
  ],
  controllers: [BridgeIntegrationController],
  providers: [
    BridgeAnalyticsService,
    BridgeIntegrationService,
    BridgeMonitorService,
    StargateBridgeAdapter,
    HopBridgeAdapter,
    AcrossBridgeAdapter,
  ],
})
export class BridgeModule {}
