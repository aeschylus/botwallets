import { WalletCommandHandler } from './WalletCommandHandler.js';
import { defaultFormatter } from './formatters.js';
import type { CreateBotConfig, BotInstance } from './types.js';

export function createBot(config: CreateBotConfig): BotInstance {
  const formatter =
    config.formatter ?? config.adapter.formatter ?? defaultFormatter;

  const handler = new WalletCommandHandler({
    formatter,
    walletIdPrefix: config.walletIdPrefix ?? config.adapter.platform,
    wallet: config.wallet,
  });

  config.adapter.register((ctx) => handler.handle(ctx));

  return {
    start: () => config.adapter.start(),
    stop: async () => {
      handler.destroy();
      await config.adapter.stop();
    },
    handler,
  };
}
