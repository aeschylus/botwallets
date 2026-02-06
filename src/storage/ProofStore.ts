import type { Database } from './Database.js';
import type { StoredProof } from '../types.js';

interface ProofRow {
  id: string;
  wallet_id: string;
  amount: number;
  secret: string;
  c: string;
  keyset_id: string;
  state: string;
  created_by_tx: string | null;
  spent_by_tx: string | null;
  created_at: string;
}

function rowToProof(row: ProofRow): StoredProof {
  return {
    id: row.id,
    walletId: row.wallet_id,
    amount: row.amount,
    secret: row.secret,
    c: row.c,
    keysetId: row.keyset_id,
    state: row.state as StoredProof['state'],
    createdByTx: row.created_by_tx,
    spentByTx: row.spent_by_tx,
    createdAt: row.created_at,
  };
}

export class ProofStore {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  insertProofs(
    walletId: string,
    proofs: Array<{ amount: number; secret: string; C: string; id: string }>,
    txId: string,
  ): void {
    const stmt = this.database.db.prepare(`
      INSERT INTO proofs (id, wallet_id, amount, secret, c, keyset_id, state, created_by_tx)
      VALUES (?, ?, ?, ?, ?, ?, 'unspent', ?)
    `);
    for (const proof of proofs) {
      stmt.run(proof.C, walletId, proof.amount, proof.secret, proof.C, proof.id, txId);
    }
  }

  getUnspentProofs(walletId: string): StoredProof[] {
    const rows = this.database.db
      .prepare(`SELECT * FROM proofs WHERE wallet_id = ? AND state = 'unspent'`)
      .all(walletId) as ProofRow[];
    return rows.map(rowToProof);
  }

  selectProofsForAmount(walletId: string, amount: number): StoredProof[] {
    const all = this.getUnspentProofs(walletId);
    all.sort((a, b) => a.amount - b.amount);

    const selected: StoredProof[] = [];
    let total = 0;
    for (const proof of all) {
      if (total >= amount) break;
      selected.push(proof);
      total += proof.amount;
    }

    if (total < amount) return [];
    return selected;
  }

  markPending(proofIds: string[], txId: string): void {
    const stmt = this.database.db.prepare(
      `UPDATE proofs SET state = 'pending', spent_by_tx = ? WHERE id = ?`,
    );
    for (const id of proofIds) {
      stmt.run(txId, id);
    }
  }

  markSpent(proofIds: string[]): void {
    const stmt = this.database.db.prepare(`UPDATE proofs SET state = 'spent' WHERE id = ?`);
    for (const id of proofIds) {
      stmt.run(id);
    }
  }

  rollbackPending(proofIds: string[]): void {
    const stmt = this.database.db.prepare(
      `UPDATE proofs SET state = 'unspent', spent_by_tx = NULL WHERE id = ?`,
    );
    for (const id of proofIds) {
      stmt.run(id);
    }
  }

  getBalance(walletId: string): number {
    const row = this.database.db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM proofs WHERE wallet_id = ? AND state = 'unspent'`)
      .get(walletId) as { total: number } | undefined;
    return row?.total ?? 0;
  }
}
