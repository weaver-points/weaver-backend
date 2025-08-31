export interface BridgeQuote {
  bridgeProtocol: string;
  estimatedAmount: string;
  bridgeFee: string;
  gasFee: string;
  totalFee: string;
  estimatedTime: number;
  securityScore: number;
  availableLiquidity: string;
}

export interface BridgeTransactionResult {
  transactionHash: string;
  bridgeTransactionId: string;
  estimatedCompletionTime: Date;
}
import { BridgeQuoteDto } from '../dto/bridge-transfer.dto';
import { BridgeTransferDto } from '../dto/bridge-transfer.dto';
import { BridgeStatusDto } from '../dto/bridge-status.dto';

export interface IBridgeAdapter {
  getQuote(params: BridgeQuoteDto): Promise<BridgeQuote>;
  executeBridge(params: BridgeTransferDto): Promise<BridgeTransactionResult>;
  getTransactionStatus(bridgeTransactionId: string): Promise<BridgeStatusDto>;
  getSupportedChains(): Promise<number[]>;
  getSupportedTokens(chainId: number): Promise<string[]>;
  getLiquidity(chainId: number, tokenAddress: string): Promise<string>;
}
