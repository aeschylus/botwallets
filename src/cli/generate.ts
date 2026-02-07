import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function writeTemplate(filename: string, content: string): void {
  const filepath = resolve(process.cwd(), filename);
  if (existsSync(filepath)) {
    console.error(`${filename} already exists. Skipping.`);
    return;
  }
  writeFileSync(filepath, content);
  console.log(`  Created ${filename}`);
}

const TELEGRAM_TEMPLATE = `import { createBot } from 'botwallets';
import { TelegramAdapter } from 'botwallets/telegram';

const bot = createBot({
  adapter: new TelegramAdapter({ token: process.env.BOT_TOKEN! }),
});

await bot.start();
process.once('SIGINT', () => bot.stop());
`;

const SLACK_TEMPLATE = `import { createBot } from 'botwallets';
import { SlackAdapter } from 'botwallets/slack';

const bot = createBot({
  adapter: new SlackAdapter({
    token: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    port: Number(process.env.PORT) || 3000,
  }),
});

await bot.start();
console.log('Slack bot running');
`;

const DISCORD_TEMPLATE = `import { Client, GatewayIntentBits } from 'discord.js';
import { createBot } from 'botwallets';
import type { Adapter, CommandContext } from 'botwallets';

class DiscordAdapter implements Adapter {
  readonly platform = 'discord';
  private client: Client;
  private handler?: (ctx: CommandContext) => Promise<void>;

  constructor(private token: string) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  register(handler: (ctx: CommandContext) => Promise<void>) {
    this.handler = handler;
  }

  async start() {
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot || !message.content.startsWith('!')) return;
      const [cmd, ...args] = message.content.slice(1).split(/\\s+/);
      const ctx: CommandContext = {
        command: cmd,
        args,
        userId: message.author.id,
        username: message.author.username,
        reply: (text) => message.reply(text).then(() => {}),
        raw: message,
      };
      await this.handler?.(ctx);
    });
    await this.client.login(this.token);
    console.log('Discord bot running');
  }

  async stop() {
    await this.client.destroy();
  }
}

const bot = createBot({
  adapter: new DiscordAdapter(process.env.DISCORD_TOKEN!),
});

await bot.start();
process.once('SIGINT', () => bot.stop());
`;

const CUSTOM_TEMPLATE = `import { createBot } from 'botwallets';
import type { Adapter, CommandContext } from 'botwallets';

class MyAdapter implements Adapter {
  readonly platform = 'my-platform';
  private handler?: (ctx: CommandContext) => Promise<void>;

  register(handler: (ctx: CommandContext) => Promise<void>) {
    this.handler = handler;
  }

  async start() {
    // TODO: Connect to your platform and wire up events.
    // When a command arrives, call this.handler with a CommandContext:
    //
    //   await this.handler?.({
    //     command: 'balance',
    //     args: [],
    //     userId: 'user-123',
    //     username: 'alice',
    //     reply: async (text) => { /* send text back to user */ },
    //   });
    //
    // Supported commands: balance, receive, send, fund, claim, history
  }

  async stop() {
    // TODO: Disconnect / clean up
  }
}

const bot = createBot({ adapter: new MyAdapter() });
await bot.start();
process.once('SIGINT', () => bot.stop());
`;

const LOBSTER_SEND = `name: send-ecash
steps:
  - id: check
    command: npx botwallets cli balance

  - id: approve
    command: echo "Send $AMOUNT sats to $RECEIVER?"
    approval: required

  - id: send
    command: npx botwallets cli send $AMOUNT --receiver $RECEIVER --note "$NOTE"
    condition: $approve.approved
`;

const LOBSTER_RECEIVE = `name: receive-ecash
steps:
  - id: receive
    command: npx botwallets cli receive $TOKEN --sender $SENDER

  - id: confirm
    command: npx botwallets cli balance
`;

const LOBSTER_PAY = `name: pay-invoice
steps:
  - id: check
    command: npx botwallets cli balance

  - id: approve
    command: echo "Pay Lightning invoice?"
    approval: required

  - id: pay
    command: npx botwallets cli pay $INVOICE --note "$NOTE"
    condition: $approve.approved
`;

const LOBSTER_FUND = `name: fund-wallet
steps:
  - id: invoice
    command: npx botwallets cli mint $AMOUNT

  - id: wait
    command: echo "Pay the invoice above, then continue."
    approval: required

  - id: claim
    command: npx botwallets cli check $QUOTE_ID
`;

export async function runGenerate(args: string[]): Promise<void> {
  const template = args[0];

  if (!template) {
    console.error('Usage: botwallets generate <template>\n');
    console.error('Templates: telegram, slack, discord, lobster, custom');
    process.exit(1);
  }

  console.log('');

  switch (template) {
    case 'telegram': {
      writeTemplate('bot.ts', TELEGRAM_TEMPLATE);
      console.log('\nNext steps:');
      console.log('  npm install telegraf');
      console.log('  BOT_TOKEN=your_token npx tsx bot.ts\n');
      break;
    }

    case 'slack': {
      writeTemplate('bot.ts', SLACK_TEMPLATE);
      console.log('\nNext steps:');
      console.log('  npm install @slack/bolt');
      console.log('  SLACK_BOT_TOKEN=xoxb-... SLACK_SIGNING_SECRET=... npx tsx bot.ts\n');
      break;
    }

    case 'discord': {
      writeTemplate('bot.ts', DISCORD_TEMPLATE);
      console.log('\nNext steps:');
      console.log('  npm install discord.js');
      console.log('  DISCORD_TOKEN=your_token npx tsx bot.ts\n');
      break;
    }

    case 'custom': {
      writeTemplate('bot.ts', CUSTOM_TEMPLATE);
      console.log('\nNext steps:');
      console.log('  1. Edit bot.ts — implement your adapter');
      console.log('  2. npx tsx bot.ts\n');
      break;
    }

    case 'lobster': {
      writeTemplate('send-ecash.lobster', LOBSTER_SEND);
      writeTemplate('receive-ecash.lobster', LOBSTER_RECEIVE);
      writeTemplate('pay-invoice.lobster', LOBSTER_PAY);
      writeTemplate('fund-wallet.lobster', LOBSTER_FUND);
      console.log('\nUsage:');
      console.log(
        '  lobster run send-ecash.lobster --args-json \'{"AMOUNT":"100","RECEIVER":"alice","NOTE":"payment"}\'',
      );
      console.log('');
      break;
    }

    default:
      console.error(`Unknown template: ${template}`);
      console.error('Available: telegram, slack, discord, lobster, custom');
      process.exit(1);
  }
}
