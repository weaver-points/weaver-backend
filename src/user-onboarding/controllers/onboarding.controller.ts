import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ZkKycService } from '../../zk-kyc/zk-kyc.service';
import { VerifyZkKycDto } from '../dto/verify-zkkyc.dto';
import { UsersService } from '../../users/users.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly zkKycService: ZkKycService,
    private readonly userService: UsersService,
  ) {}

  @Post('zkkyc/verify')
  @HttpCode(HttpStatus.OK)
  async verifyZkKyc(@Body() dto: VerifyZkKycDto) {
    const verification = await this.zkKycService.verifyWithWorldId(dto);
    return {
      success: true,
      verificationId: verification._id,
      verificationLevel: verification.verificationLevel,
      verifiedAt: verification.verifiedAt,
      expiresAt: verification.expiresAt,
    };
  }

  @Get('status/:userId')
  @HttpCode(HttpStatus.OK)
  async getStatus(@Param('userId') userId: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.address) {
      return {
        isVerified: false,
        message: 'User not found or no wallet linked',
      };
    }

    const status = await this.zkKycService.getVerificationStatus(user.address);
    return (
      status || {
        isVerified: false,
        message: 'No verification found for this wallet',
      }
    );
  }
}
