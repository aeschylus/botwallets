import { addWallet } from '../addWallet.js';
import { destroyAll } from '../pool.js';

function parseFlags(args: string[]): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[++i];
    } else {
      positional.push(args[i]);
    }
  }
  return { flags, positional };
}

export async function runCli(args: string[]): Promise<void> {
  const { flags, positional } = parseFlags(args);
  const [command, ...rest] = positional;

  if (!command) {
    console.error('Usage: botwallets cli <command> [args]\n');
    console.error('Commands: balance, info, send, receive, mint, check, pay, history');
    process.exit(1);
  }

  const wallet = await addWallet({
    walletId: flags['wallet-id'],
    mintUrl: flags['mint-url'],
    dbPath: flags['db-path'],
  });

  try {
    switch (command) {
      case 'balance': {
        console.log(JSON.stringify({ balance: wallet.getBalance() }));
        break;
      }

      case 'info': {
        console.log(JSON.stringify(wallet.getInfo(), null, 2));
        break;
      }

      case 'send': {
        const amount = parseInt(rest[0]);
        if (!amount || amount <= 0) {
          console.error('Usage: botwallets cli send <amount> [--receiver name] [--note text]');
          process.exit(1);
        }
        const token = await wallet.send(amount, {
          receiver: flags['receiver'],
          note: flags['note'],
        });
        console.log(JSON.stringify({ amount, token }));
        break;
      }

      case 'receive': {
        const token = rest[0];
        if (!token) {
          console.error('Usage: botwallets cli receive <token> [--sender name]');
          process.exit(1);
        }
        const received = await wallet.receive(token, {
          sender: flags['sender'],
        });
        console.log(JSON.stringify({ received, balance: wallet.getBalance() }));
        break;
      }

      case 'mint': {
        const amount = parseInt(rest[0]);
        if (!amount || amount <= 0) {
          console.error('Usage: botwallets cli mint <amount>');
          process.exit(1);
        }
        const invoice = await wallet.createMintInvoice(amount);
        console.log(JSON.stringify(invoice, null, 2));
        break;
      }

      case 'check': {
        const quoteId = rest[0];
        if (!quoteId) {
          console.error('Usage: botwallets cli check <quoteId>');
          process.exit(1);
        }
        const minted = await wallet.checkMintQuote(quoteId);
        if (minted !== null) {
          console.log(JSON.stringify({ minted, balance: wallet.getBalance() }));
        } else {
          console.log(JSON.stringify({ minted: null, status: 'unpaid' }));
        }
        break;
      }

      case 'pay': {
        const invoice = rest[0];
        if (!invoice) {
          console.error('Usage: botwallets cli pay <invoice> [--note text]');
          process.exit(1);
        }
        const result = await wallet.payInvoice(invoice, {
          note: flags['note'],
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'history': {
        const limit = flags['limit'] ? parseInt(flags['limit']) : 20;
        const txs = await wallet.getTransactions({ limit });
        console.log(JSON.stringify(txs, null, 2));
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (err: any) {
    console.error(JSON.stringify({ error: err.message, code: err.code }));
    process.exit(1);
  } finally {
    destroyAll();
  }
}
