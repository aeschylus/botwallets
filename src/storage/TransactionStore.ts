import type { Database } from './Database.js';
import type { TransactionRecord, TransactionMemo, TransactionQuery } from '../types.js';

interface TransactionRow {
  id: string;
  wallet_id: string;
  type: string;
  status: string;
  amount: number;
  fee: number;
  token: string | null;
  invoice: string | null;
  quote_id: string | null;
  sender: string | null;
  receiver: string | null;
  note: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

function rowToTransaction(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    walletId: row.wallet_id,
    type: row.type as TransactionRecord['type'],
    status: row.status as TransactionRecord['status'],
    amount: row.amount,
    fee: row.fee,
    token: row.token,
    invoice: row.invoice,
    quoteId: row.quote_id,
    sender: row.sender,
    receiver: row.receiver,
    note: row.note,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TransactionStore {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  insert(params: {
    id: string;
    walletId: string;
    type: TransactionRecord['type'];
    amount: number;
    memo?: TransactionMemo;
    token?: string;
    invoice?: string;
    quoteId?: string;
  }): void {
    this.database.db
      .prepare(
        `INSERT INTO transactions (id, wallet_id, type, status, amount, fee, token, invoice, quote_id, sender, receiver, note, metadata)
         VALUES (?, ?, ?, 'pending', ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.id,
        params.walletId,
        params.type,
        params.amount,
        params.token ?? null,
        params.invoice ?? null,
        params.quoteId ?? null,
        params.memo?.sender ?? null,
        params.memo?.receiver ?? null,
        params.memo?.note ?? null,
        params.memo?.metadata ? JSON.stringify(params.memo.metadata) : null,
      );
  }

  updateStatus(
    txId: string,
    status: TransactionRecord['status'],
    updates?: { amount?: number; fee?: number; token?: string },
  ): void {
    let sql = `UPDATE transactions SET status = ?, updated_at = datetime('now')`;
    const params: unknown[] = [status];

    if (updates?.amount !== undefined) {
      sql += `, amount = ?`;
      params.push(updates.amount);
    }
    if (updates?.fee !== undefined) {
      sql += `, fee = ?`;
      params.push(updates.fee);
    }
    if (updates?.token !== undefined) {
      sql += `, token = ?`;
      params.push(updates.token);
    }

    sql += ` WHERE id = ?`;
    params.push(txId);

    this.database.db.prepare(sql).run(...params);
  }

  query(walletId: string, options?: TransactionQuery): TransactionRecord[] {
    let sql = `SELECT * FROM transactions WHERE wallet_id = ?`;
    const params: unknown[] = [walletId];

    if (options?.type) {
      sql += ` AND type = ?`;
      params.push(options.type);
    }
    if (options?.status) {
      sql += ` AND status = ?`;
      params.push(options.status);
    }

    sql += ` ORDER BY created_at DESC`;

    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }
    if (options?.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const rows = this.database.db.prepare(sql).all(...params) as TransactionRow[];
    return rows.map(rowToTransaction);
  }
}
