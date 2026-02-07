import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';
import { CONFIG_FILENAME, DEFAULT_MINT_URL, DEFAULT_DB_PATH, DEFAULT_UNIT } from '../config.js';
import { CashuEngine } from '../cashu/CashuEngine.js';

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function runInit(): Promise<void> {
  const configPath = resolve(process.cwd(), CONFIG_FILENAME);

  if (existsSync(configPath)) {
    console.log(`${CONFIG_FILENAME} already exists. Delete it first to re-initialize.`);
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log('\nbotwallets setup\n');

    const mintUrl =
      (await prompt(rl, `Mint URL [${DEFAULT_MINT_URL}]: `)).trim() || DEFAULT_MINT_URL;
    const dbPath =
      (await prompt(rl, `Database path [${DEFAULT_DB_PATH}]: `)).trim() || DEFAULT_DB_PATH;
    const unit = (await prompt(rl, `Unit [${DEFAULT_UNIT}]: `)).trim() || DEFAULT_UNIT;

    console.log(`\nConnecting to ${mintUrl}...`);

    const engine = new CashuEngine(mintUrl, unit);
    await engine.ensureLoaded();

    console.log('Connected.\n');

    const config = { mintUrl, dbPath, unit };
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

    console.log(`Wrote ${CONFIG_FILENAME}`);
    console.log('\nYou can now use:');
    console.log('  npx botwallets cli balance');
    console.log('  npx botwallets generate telegram');
    console.log('');
  } finally {
    rl.close();
  }
}
