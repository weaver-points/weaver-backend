import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEthereumAddress,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BridgeTransferDto {
  @IsNotEmpty()
  @IsString()
  bridgeProtocol: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  sourceChainId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  destinationChainId: number;

  @IsNotEmpty()
  @IsEthereumAddress()
  sourceTokenAddress: string;

  @IsNotEmpty()
  @IsEthereumAddress()
  destinationTokenAddress: string;

  @IsNotEmpty()
  @IsString() // keep as string for BigNumber
  amount: string;

  @IsNotEmpty()
  @IsEthereumAddress()
  senderAddress: string;

  @IsNotEmpty()
  @IsEthereumAddress()
  recipientAddress: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  slippage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deadline?: number;
}

export class BridgeQuoteDto {
  @IsNotEmpty()
  @IsString()
  bridgeProtocol: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  sourceChainId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  destinationChainId: number;

  @IsNotEmpty()
  @IsEthereumAddress()
  tokenAddress: string;

  @IsNotEmpty()
  @IsString() 
  amount: string;
}
