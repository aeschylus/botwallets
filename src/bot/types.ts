import type { BotWalletConfig } from '../types.js';

/** Context passed to the command handler for every incoming command. */
export interface CommandContext {
  command: string;
  args: string[];
  userId: string;
  username?: string;
  reply: (text: string) => Promise<void>;
  raw?: unknown;
}

/** String-returning methods for formatting bot responses. */
export interface ResponseFormatter {
  balance(sats: number): string;
  received(amount: number, balance: number): string;
  sent(token: string): string;
  fundInvoice(invoice: string, quoteId: string): string;
  claimed(amount: number, balance: number): string;
  notPaidYet(): string;
  history(lines: string[]): string;
  error(message: string): string;
  usage(command: string, example: string): string;
  insufficientBalance(required: number, available: number): string;
}

/** Minimal interface a platform adapter must implement. */
export interface Adapter {
  readonly platform: string;
  register(handler: (ctx: CommandContext) => Promise<void>): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  formatter?: ResponseFormatter;
}

/** Configuration for createBot(). */
export interface CreateBotConfig {
  adapter: Adapter;
  formatter?: ResponseFormatter;
  wallet?: Omit<BotWalletConfig, 'walletId'>;
  walletIdPrefix?: string;
}

/** The object returned by createBot(). */
export interface BotInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
  handler: import('./WalletCommandHandler.js').WalletCommandHandler;
}
