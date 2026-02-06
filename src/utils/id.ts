import { randomBytes } from 'crypto';

export function generateWalletId(): string {
  return `bw_${randomBytes(8).toString('hex')}`;
}

export function generateTxId(): string {
  return `tx_${randomBytes(8).toString('hex')}`;
}
