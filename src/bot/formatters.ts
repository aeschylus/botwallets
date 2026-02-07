import type { ResponseFormatter } from './types.js';

/** Plain text formatter. Works everywhere. */
export const defaultFormatter: ResponseFormatter = {
  balance: (sats) => `Balance: ${sats} sats`,
  received: (amount, balance) => `Received ${amount} sats. Balance: ${balance} sats`,
  sent: (token) => token,
  fundInvoice: (invoice, quoteId) =>
    `Pay this invoice:\n${invoice}\n\nThen: /claim ${quoteId}`,
  claimed: (amount, balance) => `Minted ${amount} sats! Balance: ${balance} sats`,
  notPaidYet: () => 'Not paid yet. Try again after paying.',
  history: (lines) => lines.join('\n'),
  error: (message) => message,
  usage: (command, example) => `Usage: /${command} ${example}`,
  insufficientBalance: (required, available) =>
    `Need ${required} sats, have ${available}.`,
};

/** Wraps tokens/invoices in backtick code spans. Good for Telegram, Discord, Matrix. */
export const markdownFormatter: ResponseFormatter = {
  ...defaultFormatter,
  sent: (token) => `\`${token}\``,
  fundInvoice: (invoice, quoteId) =>
    `Pay this invoice:\n\`${invoice}\`\n\nThen: /claim \`${quoteId}\``,
};

/** Triple backticks for code blocks (Slack mrkdwn). */
export const slackFormatter: ResponseFormatter = {
  ...defaultFormatter,
  sent: (token) => `\`\`\`${token}\`\`\``,
  fundInvoice: (invoice, quoteId) =>
    `Pay this invoice:\n\`\`\`${invoice}\`\`\`\nThen: \`/claim ${quoteId}\``,
};
