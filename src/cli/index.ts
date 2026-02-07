import { runInit } from './init.js';
import { runCli } from './wallet-cli.js';
import { runGenerate } from './generate.js';

const [subcommand, ...args] = process.argv.slice(2);

const HELP = `
botwallets - Bitcoin ecash wallets for bots

Commands:
  init                  Set up a new project (interactive)
  cli <command>         Wallet operations from the terminal
  generate <template>   Scaffold a bot integration

CLI commands:
  cli balance           Show wallet balance
  cli info              Show wallet info
  cli send <amount>     Send ecash, prints token
  cli receive <token>   Receive an ecash token
  cli mint <amount>     Create a Lightning invoice to fund wallet
  cli check <quoteId>   Check if a mint invoice was paid
  cli pay <invoice>     Pay a Lightning invoice
  cli history           Show recent transactions

Templates:
  generate telegram     Telegram bot with Telegraf
  generate slack        Slack bot with Bolt
  generate discord      Discord bot (custom adapter example)
  generate lobster      Lobster workflow YAML files
  generate custom       Skeleton adapter with TODOs

Options:
  --help, -h            Show this help
  --wallet-id <id>      Wallet ID (default: from config or auto)
  --mint-url <url>      Mint URL (default: from config)
  --db-path <path>      Database path (default: from config)
`.trim();

async function main() {
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  switch (subcommand) {
    case 'init':
      await runInit();
      break;
    case 'cli':
      await runCli(args);
      break;
    case 'generate':
      await runGenerate(args);
      break;
    default:
      console.error(`Unknown command: ${subcommand}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
