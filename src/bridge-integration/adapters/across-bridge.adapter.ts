////  This is only Mock of across bridge !! 
import { Injectable, Logger } from '@nestjs/common';
import { parseUnits, parseEther } from 'ethers';
import {
  IBridgeAdapter,
  BridgeQuote,
  BridgeTransactionResult,
} from '../interface/bridge-adapter.interface';
import { BridgeQuoteDto } from '../dto/bridge-transfer.dto';
import { BridgeTransferDto } from '../dto/bridge-transfer.dto';
import { BridgeStatusDto } from '../dto/bridge-status.dto';

@Injectable()
export class AcrossBridgeAdapter implements IBridgeAdapter {
  private readonly logger = new Logger(AcrossBridgeAdapter.name);

  async getQuote(params: BridgeQuoteDto): Promise<BridgeQuote> {
    try {
      const amount = parseUnits(params.amount, 18);

      const mockQuote: BridgeQuote = {
        bridgeProtocol: 'across',
        estimatedAmount: ((amount * 999n) / 1000n).toString(), // 0.1% fee
        bridgeFee: ((amount * 1n) / 1000n).toString(),
        gasFee: parseEther('0.005').toString(),
        totalFee: parseEther('0.006').toString(),
        estimatedTime: 5, // 5 minutes
        securityScore: 88,
        availableLiquidity: parseEther('1200000').toString(),
      };

      return mockQuote;
    } catch (error) {
      this.logger.error('Failed to get Across quote', error);
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
        bridgeTransactionId: 'across_' + Date.now(),
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000),
      };

      return mockResult;
    } catch (error) {
      this.logger.error('Failed to execute Across bridge', error);
      throw new Error('Failed to execute bridge transaction');
    }
  }

  async getTransactionStatus(
    bridgeTransactionId: string,
  ): Promise<BridgeStatusDto> {
    try {
      return {
        id: bridgeTransactionId,
        bridgeProtocol: 'across',
        status: 'COMPLETED',
        sourceTxHash:
          '0x' +
          Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(''),
        destinationTxHash:
          '0x' +
          Array(64)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(''),
        completedAt: new Date(),
        progressPercentage: 100,
      };
    } catch (error) {
      this.logger.error('Failed to get Across transaction status', error);
      throw new Error('Failed to get transaction status');
    }
  }

  // this is Default chain !!
  getSupportedChains(): Promise<number[]> {
    try {
      return Promise.resolve([1, 137, 42161, 10]);
    } catch (e) {
      throw e;
    }
  }

  async getSupportedTokens(chainId: number): Promise<string[]> {
    const tokensByChain = {
      1: [
        '0xA0b86a33E6417c59D3C22e7564DdCB3394C8f5C8',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      ],
      137: [
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      ],
    };
    return tokensByChain[chainId] || [];
  }

  async getLiquidity(chainId: number, tokenAddress: string): Promise<string> {
    return parseEther('1200000').toString();
  }
}
