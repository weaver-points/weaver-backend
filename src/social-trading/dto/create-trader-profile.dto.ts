import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsObject,
} from 'class-validator';

export class CreateTraderProfileDto {
  @IsString()
  userId: string;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  managementFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  performanceFee?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  tradingHours?: {
    timezone: string;
    start: string;
    end: string;
  };
}
