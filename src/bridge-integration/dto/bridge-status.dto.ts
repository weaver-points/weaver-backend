export class BridgeStatusDto {
  id: string;
  bridgeProtocol: string;
  status: string;
  sourceTxHash: string;
  destinationTxHash?: string;
  estimatedCompletionTime?: Date;
  completedAt?: Date;
  progressPercentage: number;
}
