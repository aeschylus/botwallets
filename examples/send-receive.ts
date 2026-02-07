import { addWallet, destroyAll } from '../src/index.js';
import type { TransactionMemo } from '../src/index.js';

async function main() {
  const alice = await addWallet({ walletId: 'alice' });
  const bob = await addWallet({ walletId: 'bob' });

  console.log('Alice balance:', alice.getBalance(), 'sats');
  console.log('Bob balance:', bob.getBalance(), 'sats');

  // Alice sends 10 sats — returns an ecash token
  const memo: TransactionMemo = {
    sender: 'alice',
    receiver: 'bob',
    note: 'coffee money',
  };
  const token = await alice.send(10, memo);
  console.log('Alice sent token:', token.slice(0, 40) + '…');

  // Bob receives the token
  const received = await bob.receive(token, {
    sender: 'alice',
    receiver: 'bob',
    note: 'coffee money',
  });
  console.log('Bob received:', received, 'sats');

  // Query transaction history
  const aliceSends = await alice.getTransactions({ type: 'send' });
  console.log('Alice send txs:', aliceSends.length);

  const bobReceives = await bob.getTransactions({ type: 'receive' });
  console.log('Bob receive txs:', bobReceives.length);

  destroyAll();
}

main().catch(console.error);
