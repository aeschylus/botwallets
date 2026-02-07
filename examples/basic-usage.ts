import { addWallet, destroyAll } from '../src/index.js';

async function main() {
  // Create a wallet — reads config from botwallets.config.json if present,
  // otherwise uses testnut defaults. No config needed to get started.
  const wallet = await addWallet();

  console.log('Wallet created:', wallet.id);
  console.log('Mint URL:', wallet.mintUrl);
  console.log('Balance:', wallet.getBalance(), 'sats');
  console.log('Info:', wallet.getInfo());

  // Transaction history (empty for new wallet)
  const txs = await wallet.getTransactions();
  console.log('Transactions:', txs.length);

  // Second wallet — reuses the same DB and mint connection automatically
  const wallet2 = await addWallet({ walletId: 'second-wallet' });
  console.log('Wallet 2:', wallet2.id);
  console.log('Same mint, same DB, zero extra latency.');

  // Clean up all connections at process exit
  destroyAll();
  console.log('\nDone!');
}

main().catch(console.error);
