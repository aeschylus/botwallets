// Autonomous agent managing multiple wallets.
// Demonstrates internal transfers and per-wallet status reporting.

import { addWallet, destroyAll } from '../src/index.js';
import type { BotWallet, TransactionMemo } from '../src/index.js';

/** Send ecash from one wallet to another. */
async function internalTransfer(
  from: BotWallet,
  to: BotWallet,
  amount: number,
  note: string,
) {
  const memo: TransactionMemo = {
    sender: from.id,
    receiver: to.id,
    note,
    metadata: { type: 'internal-transfer' },
  };

  const token = await from.send(amount, memo);
  const received = await to.receive(token, memo);
  console.log(`Transferred ${received} sats: ${from.id} → ${to.id} (${note})`);
  return received;
}

/** Print wallet status. */
function printStatus(wallet: BotWallet) {
  const info = wallet.getInfo();
  console.log(`  ${info.id}: ${info.balance} sats (mint: ${info.mintUrl})`);
}

async function main() {
  // Create three purpose-specific wallets
  const treasury = await addWallet({ walletId: 'treasury' });
  const payroll = await addWallet({ walletId: 'payroll' });
  const pettyCash = await addWallet({ walletId: 'petty-cash' });

  console.log('=== Initial status ===');
  printStatus(treasury);
  printStatus(payroll);
  printStatus(pettyCash);

  // Distribute funds from treasury
  if (treasury.getBalance() >= 200) {
    await internalTransfer(treasury, payroll, 150, 'monthly payroll allocation');
    await internalTransfer(treasury, pettyCash, 50, 'petty cash top-up');
  } else {
    console.log('\nTreasury needs funding — create a mint invoice first.');
    const invoice = await treasury.createMintInvoice(500);
    console.log('Fund the treasury:', invoice.invoice);
  }

  console.log('\n=== Final status ===');
  printStatus(treasury);
  printStatus(payroll);
  printStatus(pettyCash);

  // Show transaction history across all wallets
  for (const w of [treasury, payroll, pettyCash]) {
    const txs = await w.getTransactions();
    if (txs.length > 0) {
      console.log(`\n${w.id} transactions:`);
      for (const tx of txs) {
        console.log(`  ${tx.type} ${tx.amount} sats [${tx.status}]`);
      }
    }
  }

  destroyAll();
}

main().catch(console.error);
