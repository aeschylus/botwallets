// Telegram bot using the built-in TelegramAdapter.
//
// Prerequisites:
//   1. npm install telegraf
//   2. Create a bot via @BotFather and grab the token
//   3. Set TELEGRAM_BOT_TOKEN in your environment
//
// Run:
//   TELEGRAM_BOT_TOKEN=123:ABC npx tsx examples/telegram-bot.ts

import { createBot } from '../src/index.js';
import { TelegramAdapter } from '../src/adapters/telegram.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Set TELEGRAM_BOT_TOKEN env var');
  process.exit(1);
}

const bot = createBot({
  adapter: new TelegramAdapter({ token }),
  walletIdPrefix: 'tg',
  wallet: { mintUrl: 'https://testnut.cashu.space' },
});

bot.start().then(() => console.log('Telegram bot running…'));

// Graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`\n${signal} received, shutting down…`);
    bot.stop().then(() => process.exit(0));
  });
}
