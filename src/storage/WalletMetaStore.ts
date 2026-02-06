import type { Database } from './Database.js';

interface WalletMetaRow {
  wallet_id: string;
  mint_url: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export class WalletMetaStore {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  upsert(walletId: string, mintUrl: string, unit: string): void {
    this.database.db
      .prepare(
        `INSERT INTO wallets (wallet_id, mint_url, unit)
         VALUES (?, ?, ?)
         ON CONFLICT(wallet_id) DO UPDATE SET updated_at = datetime('now')`,
      )
      .run(walletId, mintUrl, unit);
  }

  get(walletId: string): WalletMetaRow | undefined {
    return this.database.db
      .prepare(`SELECT * FROM wallets WHERE wallet_id = ?`)
      .get(walletId) as WalletMetaRow | undefined;
  }

  getCreatedAt(walletId: string): string {
    const row = this.get(walletId);
    return row?.created_at ?? new Date().toISOString();
  }
}
