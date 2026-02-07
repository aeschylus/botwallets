// Build a custom adapter for any platform.
// This demo reads commands from stdin — the same pattern works for
// Discord, Matrix, IRC, or any event-driven messaging system.

import * as readline from 'node:readline';
import { createBot, defaultFormatter } from '../src/index.js';
import type { Adapter, CommandContext, ResponseFormatter } from '../src/index.js';

/** Minimal stdin adapter — implements the Adapter interface. */
class StdinAdapter implements Adapter {
  readonly platform = 'stdin';

  private handler?: (ctx: CommandContext) => Promise<void>;
  private rl?: readline.Interface;

  register(handler: (ctx: CommandContext) => Promise<void>): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    this.rl = readline.createInterface({ input: process.stdin });
    console.log('Type a command: /balance, /send <amount>, /fund <amount>, /claim <id>, /history');

    this.rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('/')) return;

      const [command, ...args] = trimmed.slice(1).split(/\s+/);
      const ctx: CommandContext = {
        command,
        args,
        userId: 'local-user',
        username: 'you',
        reply: async (text) => console.log(`> ${text}`),
      };
      await this.handler?.(ctx);
    });
  }

  async stop(): Promise<void> {
    this.rl?.close();
  }
}

// Override just one formatter method via spread
const customFormatter: ResponseFormatter = {
  ...defaultFormatter,
  balance: (sats) => `You have ${sats} sats in your wallet.`,
};

const bot = createBot({
  adapter: new StdinAdapter(),
  formatter: customFormatter,
  walletIdPrefix: 'cli',
});

bot.start();

process.on('SIGINT', () => {
  bot.stop().then(() => process.exit(0));
});
