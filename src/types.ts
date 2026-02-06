export interface BotWalletConfig {
  walletId?: string;
  mintUrl?: string;
  dbPath?: string;
  unit?: string;
}

export interface TransactionMemo {
  sender?: string;
  receiver?: string;
  note?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface MintInvoice {
  quoteId: string;
  invoice: string;
  amount: number;
  expiry: number;
}

export interface MeltResult {
  paid: boolean;
  preimage: string | null;
  fee: number;
  change: number;
}

export interface TransactionRecord {
  id: string;
  walletId: string;
  type: 'receive' | 'send' | 'mint' | 'melt';
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  fee: number;
  token: string | null;
  invoice: string | null;
  quoteId: string | null;
  sender: string | null;
  receiver: string | null;
  note: string | null;
  metadata: Record<string, string | number | boolean> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionQuery {
  type?: 'receive' | 'send' | 'mint' | 'melt';
  status?: 'pending' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
}

export interface WalletInfo {
  id: string;
  mintUrl: string;
  unit: string;
  balance: number;
  createdAt: string;
}

export interface StoredProof {
  id: string;
  walletId: string;
  amount: number;
  secret: string;
  c: string;
  keysetId: string;
  state: 'unspent' | 'pending' | 'spent';
  createdByTx: string | null;
  spentByTx: string | null;
  createdAt: string;
}

export interface BotWallet {
  readonly id: string;
  readonly mintUrl: string;

  getBalance(): number;

  receive(token: string, memo?: TransactionMemo): Promise<number>;
  send(amount: number, memo?: TransactionMemo): Promise<string>;

  createMintInvoice(amount: number): Promise<MintInvoice>;
  checkMintQuote(quoteId: string): Promise<number | null>;
  payInvoice(invoice: string, memo?: TransactionMemo): Promise<MeltResult>;

  getTransactions(options?: TransactionQuery): Promise<TransactionRecord[]>;
  getInfo(): WalletInfo;

  destroy(): void;
}
