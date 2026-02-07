export { addWallet } from './addWallet.js';
export { destroyAll } from './pool.js';
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

// Bot plugin/adapter system
export { createBot } from './bot/createBot.js';
export { WalletCommandHandler } from './bot/WalletCommandHandler.js';
export { defaultFormatter, markdownFormatter, slackFormatter } from './bot/formatters.js';
export type {
  CommandContext,
  ResponseFormatter,
  Adapter,
  CreateBotConfig,
  BotInstance,
} from './bot/types.js';
