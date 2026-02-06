import type { BotWalletConfig, BotWallet } from './types.js';
import { DEFAULT_MINT_URL, DEFAULT_DB_PATH, DEFAULT_UNIT } from './config.js';
import { generateWalletId } from './utils/id.js';
import { Database } from './storage/Database.js';
import { CashuEngine } from './cashu/CashuEngine.js';
import { BotWalletImpl } from './BotWallet.js';

export async function addWallet(config?: BotWalletConfig): Promise<BotWallet> {
  const walletId = config?.walletId ?? generateWalletId();
  const mintUrl = config?.mintUrl ?? DEFAULT_MINT_URL;
  const dbPath = config?.dbPath ?? DEFAULT_DB_PATH;
  const unit = config?.unit ?? DEFAULT_UNIT;

  const database = new Database(dbPath);
  const engine = new CashuEngine(mintUrl, unit);

  await engine.ensureLoaded();

  return new BotWalletImpl(walletId, mintUrl, unit, database, engine);
}
