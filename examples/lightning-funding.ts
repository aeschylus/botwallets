import { addWallet, destroyAll, InsufficientBalanceError } from '../src/index.js';

/** Poll a mint quote until paid or timeout. */
async function waitForPayment(
  wallet: Awaited<ReturnType<typeof addWallet>>,
  quoteId: string,
  timeoutMs = 60_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const amount = await wallet.checkMintQuote(quoteId);
    if (amount !== null) return amount;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(`Mint quote ${quoteId} not paid within ${timeoutMs / 1000}s`);
}

async function main() {
  const wallet = await addWallet({ walletId: 'lightning-demo' });
  console.log('Balance:', wallet.getBalance(), 'sats');

  // 1. Create a Lightning invoice to fund the wallet
  const invoice = await wallet.createMintInvoice(100);
  console.log('Pay this invoice to add 100 sats:');
  console.log(invoice.invoice);
  console.log('Quote ID:', invoice.quoteId);

  // 2. Wait for the invoice to be paid (poll the mint)
  console.log('\nPolling for payment…');
  try {
    const minted = await waitForPayment(wallet, invoice.quoteId);
    console.log('Minted:', minted, 'sats');
    console.log('New balance:', wallet.getBalance(), 'sats');
  } catch (err) {
    console.log('Timed out — pay the invoice above and re-run with /claim');
    destroyAll();
    return;
  }

  // 3. Pay an outbound Lightning invoice
  const bolt11 = process.argv[2];
  if (!bolt11) {
    console.log('\nPass a bolt11 invoice as an argument to pay it out.');
    destroyAll();
    return;
  }

  try {
    const result = await wallet.payInvoice(bolt11, { note: 'outbound payment' });
    console.log('Paid:', result.paid, '| Fee:', result.fee, 'sats');
    console.log('Balance after:', wallet.getBalance(), 'sats');
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      console.error(`Not enough sats: need ${err.required}, have ${err.available}`);
    } else {
      throw err;
    }
  }

  destroyAll();
}

main().catch(console.error);
