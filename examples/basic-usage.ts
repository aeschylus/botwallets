import { addWallet } from '../src/index.js';

async function main() {
  // Create a wallet (connects to testnut mint by default)
  const wallet = await addWallet({
    dbPath: './example.db',
  });

  console.log('Wallet created:', wallet.id);
  console.log('Mint URL:', wallet.mintUrl);
  console.log('Balance:', wallet.getBalance(), 'sats');

  // Check wallet info
  const info = wallet.getInfo();
  console.log('Wallet info:', info);

  // Check transaction history (empty for new wallet)
  const txs = await wallet.getTransactions();
  console.log('Transactions:', txs.length);

  // Mint some sats (testnut is a free test mint)
  console.log('\n--- Minting sats ---');
  const invoice = await wallet.createMintInvoice(100);
  console.log('Pay this invoice:', invoice.invoice);
  console.log('Quote ID:', invoice.quoteId);

  // On testnut, quotes are auto-paid. Check the quote:
  const minted = await wallet.checkMintQuote(invoice.quoteId);
  if (minted !== null) {
    console.log('Minted:', minted, 'sats');
    console.log('New balance:', wallet.getBalance(), 'sats');
  } else {
    console.log('Quote not yet paid (expected on real mints)');
  }

  // Send ecash
  if (wallet.getBalance() > 0) {
    console.log('\n--- Sending ecash ---');
    const token = await wallet.send(50, {
      receiver: 'alice',
      note: 'test payment',
    });
    console.log('Token:', token.substring(0, 50) + '...');
    console.log('Balance after send:', wallet.getBalance(), 'sats');

    // Receive it back with a second wallet
    const wallet2 = await addWallet({
      walletId: 'receiver-wallet',
      dbPath: './example.db',
    });

    const received = await wallet2.receive(token, {
      sender: 'bot',
      note: 'received test payment',
    });
    console.log('Received:', received, 'sats');
    console.log('Wallet 2 balance:', wallet2.getBalance(), 'sats');

    // Check transaction history
    const history = await wallet2.getTransactions();
    console.log('Wallet 2 transactions:', history);

    wallet2.destroy();
  }

  wallet.destroy();
  console.log('\nDone!');
}

main().catch(console.error);
