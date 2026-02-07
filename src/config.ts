import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export const DEFAULT_MINT_URL = 'https://testnut.cashu.space';
export const DEFAULT_DB_PATH = './botwallets.db';
export const DEFAULT_UNIT = 'sat';
export const CONFIG_FILENAME = 'botwallets.config.json';

export interface FileConfig {
  mintUrl?: string;
  dbPath?: string;
  unit?: string;
}

let cachedFileConfig: FileConfig | null | undefined;

export function loadFileConfig(): FileConfig | null {
  if (cachedFileConfig !== undefined) return cachedFileConfig;

  const configPath = resolve(process.cwd(), CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    cachedFileConfig = null;
    return null;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    cachedFileConfig = JSON.parse(raw) as FileConfig;
    return cachedFileConfig;
  } catch {
    cachedFileConfig = null;
    return null;
  }
}

export function resolveConfig(overrides?: {
  mintUrl?: string;
  dbPath?: string;
  unit?: string;
}): { mintUrl: string; dbPath: string; unit: string } {
  const file = loadFileConfig();
  return {
    mintUrl: overrides?.mintUrl ?? file?.mintUrl ?? DEFAULT_MINT_URL,
    dbPath: overrides?.dbPath ?? file?.dbPath ?? DEFAULT_DB_PATH,
    unit: overrides?.unit ?? file?.unit ?? DEFAULT_UNIT,
  };
}
