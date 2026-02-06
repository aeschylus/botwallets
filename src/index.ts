export { addWallet } from './addWallet.js';
export type {
  BotWallet,
  BotWalletConfig,
  TransactionRecord,
  TransactionMemo,
  TransactionQuery,
  MintInvoice,
  MeltResult,
  WalletInfo,
} from './types.js';
export {
  BotWalletError,
  InsufficientBalanceError,
  MintConnectionError,
  InvalidTokenError,
} from './errors.js';
