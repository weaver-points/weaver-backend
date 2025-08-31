/// This is Mock of stargate !!!
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
export class StargateBridgeAdapter implements IBridgeAdapter {
  private readonly logger = new Logger(StargateBridgeAdapter.name);
  private readonly STARGATE_ROUTER_ADDRESS =
    '0x8731d54E9D02c286767d56ac03e8037C07e01e98';

  async getQuote(params: BridgeQuoteDto): Promise<BridgeQuote> {
    try {
      const amount = parseUnits(params.amount, 18);

      const mockQuote: BridgeQuote = {
        bridgeProtocol: 'stargate',
        estimatedAmount: ((amount * 995n) / 1000n).toString(), // 0.5% fee
        bridgeFee: ((amount * 5n) / 1000n).toString(),
        gasFee: parseEther('0.01').toString(),
        totalFee: parseEther('0.015').toString(),
        estimatedTime: 15, // 15 minutes
        securityScore: 95,
        availableLiquidity: parseEther('1000000').toString(),
      };

      return mockQuote;
    } catch (error) {
      this.logger.error('Failed to get Stargate quote', error);
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
        bridgeTransactionId: 'stargate_' + Date.now(),
        estimatedCompletionTime: new Date(Date.now() + 15 * 60 * 1000),
      };

      return mockResult;
    } catch (error) {
      this.logger.error('Failed to execute Stargate bridge', error);
      throw new Error('Failed to execute bridge transaction');
    }
  }

  async getTransactionStatus(
    bridgeTransactionId: string,
  ): Promise<BridgeStatusDto> {
    try {
      return {
        id: bridgeTransactionId,
        bridgeProtocol: 'stargate',
        status: 'PENDING',
        sourceTxHash:
          '0x' +
          Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(''),
        progressPercentage: Math.floor(Math.random() * 100),
      };
    } catch (error) {
      this.logger.error('Failed to get Stargate transaction status', error);
      throw new Error('Failed to get transaction status');
    }
  }

  async getSupportedChains(): Promise<number[]> {
    return [1, 137, 43114, 250, 42161, 10]; // Ethereum, Polygon, Avalanche, Fantom, Arbitrum, Optimism
  }

  async getSupportedTokens(chainId: number): Promise<string[]> {
    const tokensByChain: Record<number, string[]> = {
      1: [
        '0xA0b86a33E6417c59D3C22e7564DdCB3394C8f5C8', // USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      ],
      137: [
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
      ],
    };

    return tokensByChain[chainId] || [];
  }

  async getLiquidity(chainId: number, tokenAddress: string): Promise<string> {
    return parseEther('1000000').toString();
  }
}
