import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../src/storage/Database.js';
import { ProofStore } from '../src/storage/ProofStore.js';
import { TransactionStore } from '../src/storage/TransactionStore.js';
import { WalletMetaStore } from '../src/storage/WalletMetaStore.js';

let db: Database;

beforeEach(() => {
  db = new Database(':memory:');
});

afterEach(() => {
  db.close();
});

describe('WalletMetaStore', () => {
  it('creates and retrieves wallet metadata', () => {
    const store = new WalletMetaStore(db);
    store.upsert('bw_test1', 'https://mint.example.com', 'sat');

    const meta = store.get('bw_test1');
    expect(meta).toBeDefined();
    expect(meta!.wallet_id).toBe('bw_test1');
    expect(meta!.mint_url).toBe('https://mint.example.com');
    expect(meta!.unit).toBe('sat');
  });

  it('returns undefined for non-existent wallet', () => {
    const store = new WalletMetaStore(db);
    expect(store.get('nonexistent')).toBeUndefined();
  });
});

describe('ProofStore', () => {
  const walletId = 'bw_test1';

  beforeEach(() => {
    const meta = new WalletMetaStore(db);
    meta.upsert(walletId, 'https://mint.example.com', 'sat');
  });

  it('inserts and retrieves proofs', () => {
    const store = new ProofStore(db);
    store.insertProofs(
      walletId,
      [
        { amount: 16, secret: 'secret1', C: 'C1', id: 'keyset1' },
        { amount: 32, secret: 'secret2', C: 'C2', id: 'keyset1' },
      ],
      'tx_001',
    );

    const proofs = store.getUnspentProofs(walletId);
    expect(proofs).toHaveLength(2);
    expect(proofs[0].amount).toBe(16);
    expect(proofs[1].amount).toBe(32);
  });

  it('calculates balance from unspent proofs', () => {
    const store = new ProofStore(db);
    store.insertProofs(
      walletId,
      [
        { amount: 16, secret: 's1', C: 'C1', id: 'k1' },
        { amount: 32, secret: 's2', C: 'C2', id: 'k1' },
        { amount: 64, secret: 's3', C: 'C3', id: 'k1' },
      ],
      'tx_001',
    );

    expect(store.getBalance(walletId)).toBe(112);
  });

  it('selects proofs for amount', () => {
    const store = new ProofStore(db);
    store.insertProofs(
      walletId,
      [
        { amount: 16, secret: 's1', C: 'C1', id: 'k1' },
        { amount: 32, secret: 's2', C: 'C2', id: 'k1' },
        { amount: 64, secret: 's3', C: 'C3', id: 'k1' },
      ],
      'tx_001',
    );

    const selected = store.selectProofsForAmount(walletId, 40);
    expect(selected.length).toBeGreaterThanOrEqual(2);
    const total = selected.reduce((s, p) => s + p.amount, 0);
    expect(total).toBeGreaterThanOrEqual(40);
  });

  it('returns empty array when insufficient proofs', () => {
    const store = new ProofStore(db);
    store.insertProofs(walletId, [{ amount: 10, secret: 's1', C: 'C1', id: 'k1' }], 'tx_001');

    const selected = store.selectProofsForAmount(walletId, 100);
    expect(selected).toHaveLength(0);
  });

  it('marks proofs pending and rolls back', () => {
    const store = new ProofStore(db);
    store.insertProofs(walletId, [{ amount: 64, secret: 's1', C: 'C1', id: 'k1' }], 'tx_001');

    store.markPending(['C1'], 'tx_002');
    expect(store.getUnspentProofs(walletId)).toHaveLength(0);
    expect(store.getBalance(walletId)).toBe(0);

    store.rollbackPending(['C1']);
    expect(store.getUnspentProofs(walletId)).toHaveLength(1);
    expect(store.getBalance(walletId)).toBe(64);
  });

  it('marks proofs spent', () => {
    const store = new ProofStore(db);
    store.insertProofs(walletId, [{ amount: 64, secret: 's1', C: 'C1', id: 'k1' }], 'tx_001');

    store.markSpent(['C1']);
    expect(store.getUnspentProofs(walletId)).toHaveLength(0);
    expect(store.getBalance(walletId)).toBe(0);
  });
});

describe('TransactionStore', () => {
  const walletId = 'bw_test1';

  beforeEach(() => {
    const meta = new WalletMetaStore(db);
    meta.upsert(walletId, 'https://mint.example.com', 'sat');
  });

  it('inserts and queries transactions', () => {
    const store = new TransactionStore(db);
    store.insert({
      id: 'tx_001',
      walletId,
      type: 'receive',
      amount: 100,
      memo: { sender: 'alice', note: 'test' },
    });

    const txs = store.query(walletId);
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe('receive');
    expect(txs[0].status).toBe('pending');
    expect(txs[0].sender).toBe('alice');
    expect(txs[0].note).toBe('test');
  });

  it('updates transaction status', () => {
    const store = new TransactionStore(db);
    store.insert({ id: 'tx_001', walletId, type: 'send', amount: 50 });

    store.updateStatus('tx_001', 'completed', { fee: 1, token: 'cashuAbc...' });

    const txs = store.query(walletId);
    expect(txs[0].status).toBe('completed');
    expect(txs[0].fee).toBe(1);
    expect(txs[0].token).toBe('cashuAbc...');
  });

  it('filters by type and status', () => {
    const store = new TransactionStore(db);
    store.insert({ id: 'tx_001', walletId, type: 'receive', amount: 100 });
    store.insert({ id: 'tx_002', walletId, type: 'send', amount: 50 });
    store.updateStatus('tx_001', 'completed');

    expect(store.query(walletId, { type: 'receive' })).toHaveLength(1);
    expect(store.query(walletId, { type: 'send' })).toHaveLength(1);
    expect(store.query(walletId, { status: 'completed' })).toHaveLength(1);
    expect(store.query(walletId, { status: 'pending' })).toHaveLength(1);
  });

  it('stores and retrieves metadata as JSON', () => {
    const store = new TransactionStore(db);
    store.insert({
      id: 'tx_001',
      walletId,
      type: 'send',
      amount: 50,
      memo: { metadata: { purpose: 'tip', amount_usd: 0.05 } },
    });

    const txs = store.query(walletId);
    expect(txs[0].metadata).toEqual({ purpose: 'tip', amount_usd: 0.05 });
  });
});
