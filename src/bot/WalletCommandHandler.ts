import { addWallet } from '../addWallet.js';
import { destroyAll } from '../pool.js';
import { InsufficientBalanceError, InvalidTokenError } from '../errors.js';
import { defaultFormatter } from './formatters.js';
import type { BotWallet, BotWalletConfig } from '../types.js';
import type { CommandContext, ResponseFormatter } from './types.js';

export class WalletCommandHandler {
  private wallets = new Map<string, BotWallet>();
  private readonly formatter: ResponseFormatter;
  private readonly walletIdPrefix: string;
  private readonly walletConfig: Omit<BotWalletConfig, 'walletId'>;

  constructor(options: {
    formatter?: ResponseFormatter;
    walletIdPrefix?: string;
    wallet?: Omit<BotWalletConfig, 'walletId'>;
  } = {}) {
    this.formatter = options.formatter ?? defaultFormatter;
    this.walletIdPrefix = options.walletIdPrefix ?? 'bot';
    this.walletConfig = options.wallet ?? {};
  }

  private async getWallet(userId: string): Promise<BotWallet> {
    if (!this.wallets.has(userId)) {
      this.wallets.set(
        userId,
        await addWallet({
          ...this.walletConfig,
          walletId: `${this.walletIdPrefix}_${userId}`,
        }),
      );
    }
    return this.wallets.get(userId)!;
  }

  async handle(ctx: CommandContext): Promise<void> {
    try {
      switch (ctx.command) {
        case 'balance':
          await this.handleBalance(ctx);
          break;
        case 'receive':
          await this.handleReceive(ctx);
          break;
        case 'send':
          await this.handleSend(ctx);
          break;
        case 'fund':
          await this.handleFund(ctx);
          break;
        case 'claim':
          await this.handleClaim(ctx);
          break;
        case 'history':
          await this.handleHistory(ctx);
          break;
        // Unknown commands silently ignored
      }
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        await ctx.reply(this.formatter.insufficientBalance(err.required, err.available));
      } else if (err instanceof InvalidTokenError) {
        await ctx.reply(this.formatter.error('Invalid or spent token.'));
      } else {
        await ctx.reply(this.formatter.error((err as Error).message));
      }
    }
  }

  private async handleBalance(ctx: CommandContext): Promise<void> {
    const w = await this.getWallet(ctx.userId);
    await ctx.reply(this.formatter.balance(w.getBalance()));
  }

  private async handleReceive(ctx: CommandContext): Promise<void> {
    const token = ctx.args.join(' ').trim();
    if (!token) {
      await ctx.reply(this.formatter.usage('receive', '<cashu_token>'));
      return;
    }
    const w = await this.getWallet(ctx.userId);
    const amount = await w.receive(token, { sender: ctx.username });
    await ctx.reply(this.formatter.received(amount, w.getBalance()));
  }

  private async handleSend(ctx: CommandContext): Promise<void> {
    const amount = parseInt(ctx.args[0]);
    if (!amount || amount <= 0) {
      await ctx.reply(this.formatter.usage('send', '<amount>'));
      return;
    }
    const w = await this.getWallet(ctx.userId);
    const token = await w.send(amount, { sender: ctx.username });
    await ctx.reply(this.formatter.sent(token));
  }

  private async handleFund(ctx: CommandContext): Promise<void> {
    const amount = parseInt(ctx.args[0]);
    if (!amount || amount <= 0) {
      await ctx.reply(this.formatter.usage('fund', '<amount>'));
      return;
    }
    const w = await this.getWallet(ctx.userId);
    const inv = await w.createMintInvoice(amount);
    await ctx.reply(this.formatter.fundInvoice(inv.invoice, inv.quoteId));
  }

  private async handleClaim(ctx: CommandContext): Promise<void> {
    const quoteId = ctx.args[0];
    if (!quoteId) {
      await ctx.reply(this.formatter.usage('claim', '<quote_id>'));
      return;
    }
    const w = await this.getWallet(ctx.userId);
    const minted = await w.checkMintQuote(quoteId);
    if (minted !== null) {
      await ctx.reply(this.formatter.claimed(minted, w.getBalance()));
    } else {
      await ctx.reply(this.formatter.notPaidYet());
    }
  }

  private async handleHistory(ctx: CommandContext): Promise<void> {
    const w = await this.getWallet(ctx.userId);
    const txs = await w.getTransactions({ limit: 5 });
    if (!txs.length) {
      await ctx.reply('No transactions yet.');
      return;
    }
    const lines = txs.map((tx) => {
      const sign = tx.type === 'receive' || tx.type === 'mint' ? '+' : '-';
      return `${sign}${tx.amount} sats (${tx.type}) — ${tx.status}`;
    });
    await ctx.reply(this.formatter.history(lines));
  }

  destroy(): void {
    destroyAll();
  }
}
