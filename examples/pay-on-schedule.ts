// Self-running payment agent.
// Checks balance on a timer, funds itself via Lightning if low,
// and pays a recurring invoice each cycle.

import {
  addWallet,
  destroyAll,
  InsufficientBalanceError,
  MintConnectionError,
} from '../src/index.js';

const INTERVAL_MS = 30_000; // 30 seconds between cycles
const MIN_BALANCE = 50; // fund if below this
const FUND_AMOUNT = 200; // sats to request when funding

async function main() {
  const wallet = await addWallet({ walletId: 'scheduler' });
  const targetInvoice = process.argv[2];

  if (!targetInvoice) {
    console.log('Usage: npx tsx examples/pay-on-schedule.ts <bolt11-invoice>');
    destroyAll();
    return;
  }

  let pendingQuoteId: string | null = null;

  async function cycle() {
    console.log(`\n[${new Date().toISOString()}] Balance: ${wallet.getBalance()} sats`);

    // Claim any pending mint quote from a prior cycle
    if (pendingQuoteId) {
      try {
        const minted = await wallet.checkMintQuote(pendingQuoteId);
        if (minted !== null) {
          console.log(`Claimed ${minted} sats from pending quote`);
          pendingQuoteId = null;
        } else {
          console.log('Pending quote not paid yet');
        }
      } catch (err) {
        console.error('Error checking quote:', err);
      }
    }

    // Fund if balance is low
    if (wallet.getBalance() < MIN_BALANCE && !pendingQuoteId) {
      console.log(`Balance low — requesting ${FUND_AMOUNT} sat invoice`);
      try {
        const invoice = await wallet.createMintInvoice(FUND_AMOUNT);
        pendingQuoteId = invoice.quoteId;
        console.log('Pay to fund:', invoice.invoice);
      } catch (err) {
        if (err instanceof MintConnectionError) {
          console.error('Mint unreachable, will retry next cycle');
        } else {
          throw err;
        }
      }
      return; // wait for funding before attempting payment
    }

    // Attempt payment
    try {
      const result = await wallet.payInvoice(targetInvoice, {
        note: 'scheduled payment',
        metadata: { cycle: new Date().toISOString() },
      });
      console.log(`Payment ${result.paid ? 'succeeded' : 'failed'} | fee: ${result.fee} sats`);
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        console.log(`Need ${err.required} sats, have ${err.available} — skipping`);
      } else if (err instanceof MintConnectionError) {
        console.error('Mint unreachable, will retry next cycle');
      } else {
        throw err;
      }
    }
  }

  // Run first cycle immediately, then on interval
  await cycle();
  const timer = setInterval(() => cycle().catch(console.error), INTERVAL_MS);

  // Graceful shutdown
  function shutdown() {
    console.log('\nShutting down…');
    clearInterval(timer);
    destroyAll();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`\nAgent running — paying every ${INTERVAL_MS / 1000}s. Ctrl+C to stop.`);
}

main().catch(console.error);
