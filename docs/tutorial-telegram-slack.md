# Integrating botwallets with Telegram and Slack bots

Add a bitcoin wallet to your chat bot. Users get `/balance`, `/send`, `/receive`, `/fund`, `/claim`, and `/history` commands out of the box.

## Quick start

```bash
npm install botwallets
npx botwallets init
npx botwallets generate telegram   # or: generate slack
```

### Telegram (5 lines)

```bash
npm install telegraf
```

```typescript
import { createBot } from 'botwallets';
import { TelegramAdapter } from 'botwallets/telegram';

const bot = createBot({
  adapter: new TelegramAdapter({ token: process.env.BOT_TOKEN! }),
});

await bot.start();
process.once('SIGINT', () => bot.stop());
```

```bash
BOT_TOKEN=your_token npx tsx bot.ts
```

### Slack

```bash
npm install @slack/bolt
```

```typescript
import { createBot } from 'botwallets';
import { SlackAdapter } from 'botwallets/slack';

const bot = createBot({
  adapter: new SlackAdapter({
    token: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
  }),
});

await bot.start();
```

```bash
SLACK_BOT_TOKEN=xoxb-... SLACK_SIGNING_SECRET=... npx tsx bot.ts
```

## Custom platforms

Implement the `Adapter` interface to add any platform:

```typescript
import { createBot } from 'botwallets';
import type { Adapter, CommandContext } from 'botwallets';

class DiscordAdapter implements Adapter {
  readonly platform = 'discord';
  private handler?: (ctx: CommandContext) => Promise<void>;

  register(handler: (ctx: CommandContext) => Promise<void>) {
    this.handler = handler;
  }

  async start() {
    // Connect and wire events to call this.handler
  }

  async stop() {
    // Disconnect
  }
}

const bot = createBot({ adapter: new DiscordAdapter() });
await bot.start();
```

Run `npx botwallets generate discord` for a full working example, or `npx botwallets generate custom` for a skeleton.

## Customizing

### Wallet configuration

Pass wallet config through `createBot`:

```typescript
const bot = createBot({
  adapter: new TelegramAdapter({ token: process.env.BOT_TOKEN! }),
  walletIdPrefix: 'mybot',    // wallet IDs become mybot_<userId>
  wallet: {
    mintUrl: 'https://my-mint.example.com',
    dbPath: './mybot.db',
  },
});
```

### Custom formatter

Override how responses look:

```typescript
import { createBot, defaultFormatter } from 'botwallets';

const bot = createBot({
  adapter: new TelegramAdapter({ token: process.env.BOT_TOKEN! }),
  formatter: {
    ...defaultFormatter,
    balance: (sats) => `You have **${sats}** sats`,
  },
});
```

Three built-in formatters are available: `defaultFormatter` (plain text), `markdownFormatter` (backtick code spans), and `slackFormatter` (triple backticks).

### Accessing the handler directly

The `handler` property on the bot instance gives you access to the `WalletCommandHandler` for advanced use cases:

```typescript
const bot = createBot({ adapter: myAdapter });
// bot.handler is a WalletCommandHandler instance
```

## About mints

The mint is the server that backs ecash with real bitcoin.

- **testnut.cashu.space** is a test mint with fake sats. Good for development.
- For production, use a mint you trust or run your own with [Nutshell](https://github.com/cashubtc/nutshell) or [moksha](https://github.com/ngutech21/moksha).
- All wallets in your bot should use the same mint, otherwise users can't transfer ecash to each other.
- If the mint disappears, the sats are gone. This is the fundamental tradeoff of Cashu.
