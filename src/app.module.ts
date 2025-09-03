import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ReputationModule } from './reputation/reputation.module';
import { NftsModule } from './nfts/nfts.module';
import { User, UserSchema } from './users/entities/user.entity';
import {
  Organization,
  OrganizationSchema,
} from './organizations/entities/organization.entity';
import {
  Reputation,
  ReputationSchema,
} from './reputation/entities/reputation.entity';
import { Nft, NftSchema } from './nfts/entities/nft.entity';
import { OnchainNotificationsModule } from './onchain-notifications/onchain-notifications.module';
import { ZkKycModule } from './zk-kyc/zk-kyc.module';
import {
  ZkKycVerification,
  ZkKycVerificationSchema,
} from './zk-kyc/entities/zk-kyc-verification.entity';
import { OnboardingModule } from './user-onboarding/user-onboarding.module';
import { EventManagementModule } from './event-management/event-management.module';
import { BridgeModule } from './bridge-integration/bridge-integration.module';
import {AnalyticsDashboardModule} from './analytics-dashboard.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: Reputation.name, schema: ReputationSchema },
      { name: Nft.name, schema: NftSchema },
      { name: ZkKycVerification.name, schema: ZkKycVerificationSchema },
    ]),
    UsersModule,
    OrganizationsModule,
    ReputationModule,
    NftsModule,
    OnchainNotificationsModule,
    ZkKycModule,
    OnboardingModule,
    EventManagementModule,
    BridgeModule,
    AnalyticsDashboardModule,

  ],
})
export class AppModule {}
