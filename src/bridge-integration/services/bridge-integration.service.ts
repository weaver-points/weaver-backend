import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BridgeTransaction } from '../entities/bridge-transaction.entity';
import { BridgeProtocol } from '../entities/bridge-protocol.entity';
import { BridgeQuoteDto, BridgeTransferDto } from '../dto/bridge-transfer.dto';
import { BridgeStatusDto } from '../dto/bridge-status.dto';
import { StargateBridgeAdapter } from '../adapters/stargate-bridge.adapter';
import { HopBridgeAdapter } from '../adapters/hop-bridge.adapter';
import { AcrossBridgeAdapter } from '../adapters/across-bridge.adapter';
import {
  IBridgeAdapter,
  BridgeQuote,
} from '../interface/bridge-adapter.interface';

@Injectable()
export class BridgeIntegrationService {
  private readonly logger = new Logger(BridgeIntegrationService.name);
  private readonly bridgeAdapters: Map<string, IBridgeAdapter> = new Map();

  constructor(
    @InjectRepository(BridgeTransaction)
    private bridgeTransactionRepository: Repository<BridgeTransaction>,
    @InjectRepository(BridgeProtocol)
    private bridgeProtocolRepository: Repository<BridgeProtocol>,
    private stargateBridgeAdapter: StargateBridgeAdapter,
    private hopBridgeAdapter: HopBridgeAdapter,
    private acrossBridgeAdapter: AcrossBridgeAdapter,
  ) {
    this.initializeBridgeAdapters();
  }

  private initializeBridgeAdapters() {
    this.bridgeAdapters.set('stargate', this.stargateBridgeAdapter);
    this.bridgeAdapters.set('hop', this.hopBridgeAdapter);
    this.bridgeAdapters.set('across', this.acrossBridgeAdapter);
  }

  async getAllQuotes(params: BridgeQuoteDto): Promise<BridgeQuote[]> {
    const quotes: BridgeQuote[] = [];

    for (const [protocolName, adapter] of this.bridgeAdapters) {
      try {
        const quote = await adapter.getQuote({
          ...params,
          bridgeProtocol: protocolName,
        });
        quotes.push(quote);
      } catch (error) {
        this.logger.warn(`Failed to get quote from ${protocolName}`, error);
      }
    }

    return quotes.sort((a, b) => {
      const scoreA = parseFloat(a.totalFee) + a.estimatedTime * 0.01;
      const scoreB = parseFloat(b.totalFee) + b.estimatedTime * 0.01;
      return scoreA - scoreB;
    });
  }

  async executeBridge(params: BridgeTransferDto): Promise<string> {
    const adapter = this.bridgeAdapters.get(params.bridgeProtocol);
    if (!adapter) {
      throw new Error(`Unsupported bridge protocol: ${params.bridgeProtocol}`);
    }

    try {
      const result = await adapter.executeBridge(params);

      const bridgeTransaction = this.bridgeTransactionRepository.create({
        bridgeProtocol: params.bridgeProtocol,
        sourceChainId: params.sourceChainId,
        destinationChainId: params.destinationChainId,
        sourceTokenAddress: params.sourceTokenAddress,
        destinationTokenAddress: params.destinationTokenAddress,
        amount: params.amount,
        senderAddress: params.senderAddress,
        recipientAddress: params.recipientAddress,
        sourceTxHash: result.transactionHash,
        status: 'INITIATED',
        estimatedCompletionTime: result.estimatedCompletionTime,
        metadata: { bridgeTransactionId: result.bridgeTransactionId },
      });

      await this.bridgeTransactionRepository.save(bridgeTransaction);

      return bridgeTransaction.id;
    } catch (error) {
      this.logger.error('Failed to execute bridge transaction', error);
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string): Promise<BridgeStatusDto> {
    const transaction = await this.bridgeTransactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const adapter = this.bridgeAdapters.get(transaction.bridgeProtocol);
    if (!adapter) {
      throw new Error(
        `Unsupported bridge protocol: ${transaction.bridgeProtocol}`,
      );
    }

    const bridgeTransactionId = transaction.metadata?.bridgeTransactionId;
    if (!bridgeTransactionId) {
      return {
        id: transactionId,
        bridgeProtocol: transaction.bridgeProtocol,
        status: transaction.status,
        sourceTxHash: transaction.sourceTxHash,
        destinationTxHash: transaction.destinationTxHash,
        estimatedCompletionTime: transaction.estimatedCompletionTime,
        completedAt: transaction.completedAt,
        progressPercentage: this.calculateProgressPercentage(
          transaction.status,
        ),
      };
    }

    try {
      const status = await adapter.getTransactionStatus(bridgeTransactionId);

      if (status.status !== transaction.status) {
        await this.bridgeTransactionRepository.update(transactionId, {
          status: status.status,
          destinationTxHash:
            status.destinationTxHash || transaction.destinationTxHash,
          completedAt: status.completedAt || transaction.completedAt,
        });
      }

      return { ...status, id: transactionId };
    } catch (error) {
      this.logger.error('Failed to get transaction status', error);
      return {
        id: transactionId,
        bridgeProtocol: transaction.bridgeProtocol,
        status: transaction.status,
        sourceTxHash: transaction.sourceTxHash,
        progressPercentage: this.calculateProgressPercentage(
          transaction.status,
        ),
      };
    }
  }

  private calculateProgressPercentage(status: string): number {
    const statusMap = {
      INITIATED: 10,
      PENDING: 50,
      CONFIRMED: 75,
      COMPLETED: 100,
      FAILED: 0,
    };
    return statusMap[status] || 0;
  }

  async getSupportedRoutes(): Promise<
    Array<{
      bridgeProtocol: string;
      sourceChainId: number;
      destinationChainId: number;
      supportedTokens: string[];
    }>
  > {
    const routes: Array<{
      bridgeProtocol: string;
      sourceChainId: number;
      destinationChainId: number;
      supportedTokens: string[];
    }> = [];

    for (const [protocolName, adapter] of this.bridgeAdapters) {
      try {
        const supportedChains = await adapter.getSupportedChains();

        for (const sourceChain of supportedChains) {
          for (const destChain of supportedChains) {
            if (sourceChain !== destChain) {
              const tokens = await adapter.getSupportedTokens(sourceChain);
              routes.push({
                bridgeProtocol: protocolName,
                sourceChainId: sourceChain,
                destinationChainId: destChain,
                supportedTokens: tokens,
              });
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get supported routes for ${protocolName}`,
          error,
        );
      }
    }

    return routes;
  }
}
