export class VerifyZkKycDto {
  walletAddress: string;
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: 'device' | 'orb';
  app_id: string;
  action: string;
  signal?: string;
}
