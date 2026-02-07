import type { BotWalletConfig, BotWallet } from './types.js';
import { resolveConfig } from './config.js';
import { generateWalletId } from './utils/id.js';
import { getEngine, getDatabase } from './pool.js';
import { BotWalletImpl } from './BotWallet.js';

export async function addWallet(config?: BotWalletConfig): Promise<BotWallet> {
  const walletId = config?.walletId ?? generateWalletId();
  const { mintUrl, dbPath, unit } = resolveConfig(config);

  const database = getDatabase(dbPath);
  const engine = getEngine(mintUrl, unit);

  await engine.ensureLoaded();

  return new BotWalletImpl(walletId, mintUrl, unit, database, engine);
}
