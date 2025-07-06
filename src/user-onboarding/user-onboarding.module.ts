import { Module } from '@nestjs/common';
import { OnboardingController } from './controllers/onboarding.controller';
import { ZkKycModule } from '../zk-kyc/zk-kyc.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ZkKycModule, UsersModule],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
