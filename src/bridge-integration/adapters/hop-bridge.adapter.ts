/// This is mock of Hop !!
import { Injectable, Logger } from '@nestjs/common';
import { parseEther, parseUnits } from 'ethers';
import {
  IBridgeAdapter,
  BridgeQuote,
  BridgeTransactionResult,
} from '../interface/bridge-adapter.interface';
import { BridgeQuoteDto } from '../dto/bridge-transfer.dto';
import { BridgeTransferDto } from '../dto/bridge-transfer.dto';
import { BridgeStatusDto } from '../dto/bridge-status.dto';

@Injectable()
export class HopBridgeAdapter implements IBridgeAdapter {
  private readonly logger = new Logger(HopBridgeAdapter.name);

  async getQuote(params: BridgeQuoteDto): Promise<BridgeQuote> {
    try {
      const amount = parseUnits(params.amount, 18);

      const mockQuote: BridgeQuote = {
        bridgeProtocol: 'hop',
        estimatedAmount: ((amount * 997n) / 1000n).toString(), // 0.3% fee
        bridgeFee: ((amount * 3n) / 1000n).toString(),
        gasFee: parseEther('0.008').toString(),
        totalFee: parseEther('0.011').toString(),
        estimatedTime: 10, // 10 minutes
        securityScore: 90,
        availableLiquidity: parseEther('800000').toString(),
      };

      return mockQuote;
    } catch (error) {
      this.logger.error('Failed to get Hop quote', error);
      throw new Error('Failed to get bridge quote');
    }
  }

  async executeBridge(
    params: BridgeTransferDto,
  ): Promise<BridgeTransactionResult> {
    try {
      const mockResult: BridgeTransactionResult = {
        transactionHash:
          '0x' +
          Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(''),
        bridgeTransactionId: 'hop_' + Date.now(),
        estimatedCompletionTime: new Date(Date.now() + 10 * 60 * 1000),
      };

      return mockResult;
    } catch (error) {
      this.logger.error('Failed to execute Hop bridge', error);
      throw new Error('Failed to execute bridge transaction');
    }
  }

  async getTransactionStatus(
    bridgeTransactionId: string,
  ): Promise<BridgeStatusDto> {
    try {
      return {
        id: bridgeTransactionId,
        bridgeProtocol: 'hop',
        status: 'CONFIRMED',
        sourceTxHash:
          '0x' +
          Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(''),
        progressPercentage: Math.floor(Math.random() * 100),
      };
    } catch (error) {
      this.logger.error('Failed to get Hop transaction status', error);
      throw new Error('Failed to get transaction status');
    }
  }

  async getSupportedChains(): Promise<number[]> {
    return [1, 137, 42161, 10, 100]; // Ethereum, Polygon, Arbitrum, Optimism, Gnosis
  }

  async getSupportedTokens(chainId: number): Promise<string[]> {
    const tokensByChain: Record<number, string[]> = {
      1: [
        '0xA0b86a33E6417c59D3C22e7564DdCB3394C8f5C8', // USDC
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
      ],
      137: [
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI
      ],
    };

    return tokensByChain[chainId] || [];
  }

  async getLiquidity(chainId: number, tokenAddress: string): Promise<string> {
    return parseEther('800000').toString();
  }
}
