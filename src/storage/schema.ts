export const CREATE_WALLETS_TABLE = `
CREATE TABLE IF NOT EXISTS wallets (
  wallet_id TEXT PRIMARY KEY,
  mint_url TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'sat',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const CREATE_PROOFS_TABLE = `
CREATE TABLE IF NOT EXISTS proofs (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  secret TEXT NOT NULL,
  c TEXT NOT NULL,
  keyset_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'unspent' CHECK (state IN ('unspent', 'pending', 'spent')),
  created_by_tx TEXT,
  spent_by_tx TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id)
)`;

export const CREATE_TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receive', 'send', 'mint', 'melt')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  amount INTEGER NOT NULL DEFAULT 0,
  fee INTEGER NOT NULL DEFAULT 0,
  token TEXT,
  invoice TEXT,
  quote_id TEXT,
  sender TEXT,
  receiver TEXT,
  note TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id)
)`;

export const CREATE_PROOFS_STATE_INDEX = `
CREATE INDEX IF NOT EXISTS idx_proofs_wallet_state ON proofs(wallet_id, state)`;

export const CREATE_TX_WALLET_INDEX = `
CREATE INDEX IF NOT EXISTS idx_tx_wallet ON transactions(wallet_id, created_at DESC)`;

export const ALL_MIGRATIONS = [
  CREATE_WALLETS_TABLE,
  CREATE_PROOFS_TABLE,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_PROOFS_STATE_INDEX,
  CREATE_TX_WALLET_INDEX,
];
