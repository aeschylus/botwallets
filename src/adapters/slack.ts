import { slackFormatter } from '../bot/formatters.js';
import type { Adapter, CommandContext, ResponseFormatter } from '../bot/types.js';

export interface SlackAdapterConfig {
  token: string;
  signingSecret: string;
  port?: number;
}

export class SlackAdapter implements Adapter {
  readonly platform = 'slack';
  readonly formatter: ResponseFormatter = slackFormatter;

  private readonly config: SlackAdapterConfig;
  private app: any;
  private handler?: (ctx: CommandContext) => Promise<void>;

  constructor(config: SlackAdapterConfig) {
    this.config = config;
  }

  register(handler: (ctx: CommandContext) => Promise<void>): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    let App: any;
    try {
      // @ts-ignore — @slack/bolt is an optional peer dependency
      ({ App } = await import('@slack/bolt'));
    } catch {
      throw new Error(
        '@slack/bolt is required for SlackAdapter. Install it: npm install @slack/bolt',
      );
    }

    this.app = new App({
      token: this.config.token,
      signingSecret: this.config.signingSecret,
    });

    const commands = ['balance', 'receive', 'send', 'fund', 'claim', 'history'] as const;

    for (const cmd of commands) {
      this.app.command(`/${cmd}`, async ({ command, ack, respond }: any) => {
        await ack();
        const args = (command.text ?? '').trim().split(/\s+/).filter(Boolean);
        const ctx: CommandContext = {
          command: cmd,
          args,
          userId: command.user_id,
          username: command.user_name,
          reply: (text: string) => respond(text),
          raw: { command, respond },
        };
        await this.handler?.(ctx);
      });
    }

    await this.app.start(this.config.port ?? 3000);
  }

  async stop(): Promise<void> {
    await this.app?.stop();
  }
}
