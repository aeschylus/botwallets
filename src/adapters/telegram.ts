import { markdownFormatter } from '../bot/formatters.js';
import type { Adapter, CommandContext, ResponseFormatter } from '../bot/types.js';

export interface TelegramAdapterConfig {
  token: string;
}

export class TelegramAdapter implements Adapter {
  readonly platform = 'telegram';
  readonly formatter: ResponseFormatter = markdownFormatter;

  private readonly token: string;
  private bot: any;
  private handler?: (ctx: CommandContext) => Promise<void>;

  constructor(config: TelegramAdapterConfig) {
    this.token = config.token;
  }

  register(handler: (ctx: CommandContext) => Promise<void>): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    let Telegraf: any;
    try {
      // @ts-ignore — telegraf is an optional peer dependency
      ({ Telegraf } = await import('telegraf'));
    } catch {
      throw new Error(
        'telegraf is required for TelegramAdapter. Install it: npm install telegraf',
      );
    }

    this.bot = new Telegraf(this.token);
    const commands = ['balance', 'receive', 'send', 'fund', 'claim', 'history'] as const;

    for (const cmd of commands) {
      this.bot.command(cmd, async (tgCtx: any) => {
        const args = (tgCtx.message?.text ?? '').split(' ').slice(1);
        const ctx: CommandContext = {
          command: cmd,
          args,
          userId: String(tgCtx.from.id),
          username: tgCtx.from.username,
          reply: (text: string) => tgCtx.reply(text),
          raw: tgCtx,
        };
        await this.handler?.(ctx);
      });
    }

    await this.bot.launch();
  }

  async stop(): Promise<void> {
    this.bot?.stop();
  }
}
