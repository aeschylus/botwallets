import type { Proof } from '@cashu/cashu-ts';
import type {
  BotWallet,
  TransactionMemo,
  TransactionQuery,
  TransactionRecord,
  MintInvoice,
  MeltResult,
  WalletInfo,
} from './types.js';
import { InsufficientBalanceError } from './errors.js';
import { generateTxId } from './utils/id.js';
import type { Database } from './storage/Database.js';
import { ProofStore } from './storage/ProofStore.js';
import { TransactionStore } from './storage/TransactionStore.js';
import { WalletMetaStore } from './storage/WalletMetaStore.js';
import { CashuEngine } from './cashu/CashuEngine.js';

export class BotWalletImpl implements BotWallet {
  readonly id: string;
  readonly mintUrl: string;

  private database: Database;
  private proofStore: ProofStore;
  private txStore: TransactionStore;
  private metaStore: WalletMetaStore;
  private engine: CashuEngine;
  private unit: string;

  constructor(
    id: string,
    mintUrl: string,
    unit: string,
    database: Database,
    engine: CashuEngine,
  ) {
    this.id = id;
    this.mintUrl = mintUrl;
    this.unit = unit;
    this.database = database;
    this.engine = engine;

    this.proofStore = new ProofStore(database);
    this.txStore = new TransactionStore(database);
    this.metaStore = new WalletMetaStore(database);

    this.metaStore.upsert(id, mintUrl, unit);
  }

  getBalance(): number {
    return this.proofStore.getBalance(this.id);
  }

  async receive(token: string, memo?: TransactionMemo): Promise<number> {
    const decoded = this.engine.decodeToken(token);
    const totalAmount = decoded.proofs.reduce((sum, p) => sum + p.amount, 0);

    const txId = generateTxId();
    this.txStore.insert({
      id: txId,
      walletId: this.id,
      type: 'receive',
      amount: totalAmount,
      memo,
      token,
    });

    try {
      const freshProofs = await this.engine.receive(token);
      const received = freshProofs.reduce((sum, p) => sum + p.amount, 0);

      this.database.transaction(() => {
        this.proofStore.insertProofs(this.id, freshProofs, txId);
        this.txStore.updateStatus(txId, 'completed', { amount: received });
      });

      return received;
    } catch (err) {
      this.txStore.updateStatus(txId, 'failed');
      throw err;
    }
  }

  async send(amount: number, memo?: TransactionMemo): Promise<string> {
    const balance = this.getBalance();
    if (balance < amount) {
      throw new InsufficientBalanceError(amount, balance);
    }

    const selected = this.proofStore.selectProofsForAmount(this.id, amount);
    if (selected.length === 0) {
      throw new InsufficientBalanceError(amount, balance);
    }

    const txId = generateTxId();
    const proofIds = selected.map((p) => p.id);

    this.database.transaction(() => {
      this.txStore.insert({
        id: txId,
        walletId: this.id,
        type: 'send',
        amount,
        memo,
      });
      this.proofStore.markPending(proofIds, txId);
    });

    try {
      const cashuProofs: Proof[] = selected.map((p) => ({
        id: p.keysetId,
        amount: p.amount,
        secret: p.secret,
        C: p.c,
      }));

      const { keep, send } = await this.engine.send(amount, cashuProofs);
      const tokenString = this.engine.encodeToken(this.mintUrl, send, this.unit);

      this.database.transaction(() => {
        this.proofStore.markSpent(proofIds);
        if (keep.length > 0) {
          this.proofStore.insertProofs(this.id, keep, txId);
        }
        this.txStore.updateStatus(txId, 'completed', { token: tokenString });
      });

      return tokenString;
    } catch (err) {
      this.database.transaction(() => {
        this.proofStore.rollbackPending(proofIds);
        this.txStore.updateStatus(txId, 'failed');
      });
      throw err;
    }
  }

  async createMintInvoice(amount: number): Promise<MintInvoice> {
    const quote = await this.engine.createMintQuote(amount);
    const txId = generateTxId();

    this.txStore.insert({
      id: txId,
      walletId: this.id,
      type: 'mint',
      amount,
      invoice: quote.request,
      quoteId: quote.quote,
    });

    return {
      quoteId: quote.quote,
      invoice: quote.request,
      amount: quote.amount,
      expiry: quote.expiry,
    };
  }

  async checkMintQuote(quoteId: string): Promise<number | null> {
    const quoteResponse = await this.engine.checkMintQuote(quoteId);

    if (quoteResponse.state === 'PAID') {
      const proofs = await this.engine.mintProofs(quoteResponse.amount, quoteResponse);
      const minted = proofs.reduce((sum, p) => sum + p.amount, 0);

      this.database.transaction(() => {
        const txRows = this.txStore.query(this.id, { type: 'mint' });
        const tx = txRows.find((t) => t.quoteId === quoteId);
        if (tx) {
          this.proofStore.insertProofs(this.id, proofs, tx.id);
          this.txStore.updateStatus(tx.id, 'completed', { amount: minted });
        }
      });

      return minted;
    }

    return null;
  }

  async payInvoice(invoice: string, memo?: TransactionMemo): Promise<MeltResult> {
    const meltQuote = await this.engine.createMeltQuote(invoice);
    const totalNeeded = meltQuote.amount + meltQuote.fee_reserve;

    const balance = this.getBalance();
    if (balance < totalNeeded) {
      throw new InsufficientBalanceError(totalNeeded, balance);
    }

    const selected = this.proofStore.selectProofsForAmount(this.id, totalNeeded);
    if (selected.length === 0) {
      throw new InsufficientBalanceError(totalNeeded, balance);
    }

    const txId = generateTxId();
    const proofIds = selected.map((p) => p.id);

    this.database.transaction(() => {
      this.txStore.insert({
        id: txId,
        walletId: this.id,
        type: 'melt',
        amount: meltQuote.amount,
        memo,
        invoice,
        quoteId: meltQuote.quote,
      });
      this.proofStore.markPending(proofIds, txId);
    });

    try {
      const cashuProofs: Proof[] = selected.map((p) => ({
        id: p.keysetId,
        amount: p.amount,
        secret: p.secret,
        C: p.c,
      }));

      const result = await this.engine.meltProofs(meltQuote, cashuProofs);
      const paid = result.quote.state === 'PAID';
      const fee = meltQuote.fee_reserve;
      const changeAmount = result.change.reduce((sum, p) => sum + p.amount, 0);

      this.database.transaction(() => {
        this.proofStore.markSpent(proofIds);
        if (result.change.length > 0) {
          this.proofStore.insertProofs(this.id, result.change, txId);
        }
        this.txStore.updateStatus(txId, paid ? 'completed' : 'failed', {
          fee: fee - changeAmount,
        });
      });

      return {
        paid,
        preimage: result.quote.payment_preimage,
        fee: fee - changeAmount,
        change: changeAmount,
      };
    } catch (err) {
      this.database.transaction(() => {
        this.proofStore.rollbackPending(proofIds);
        this.txStore.updateStatus(txId, 'failed');
      });
      throw err;
    }
  }

  async getTransactions(options?: TransactionQuery): Promise<TransactionRecord[]> {
    return this.txStore.query(this.id, options);
  }

  getInfo(): WalletInfo {
    return {
      id: this.id,
      mintUrl: this.mintUrl,
      unit: this.unit,
      balance: this.getBalance(),
      createdAt: this.metaStore.getCreatedAt(this.id),
    };
  }

  destroy(): void {
    this.database.close();
  }
}
