export class BotWalletError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BotWalletError';
    this.code = code;
  }
}

export class InsufficientBalanceError extends BotWalletError {
  readonly required: number;
  readonly available: number;

  constructor(required: number, available: number) {
    super(
      `Insufficient balance: need ${required} sats but only ${available} available`,
      'INSUFFICIENT_BALANCE',
    );
    this.name = 'InsufficientBalanceError';
    this.required = required;
    this.available = available;
  }
}

export class MintConnectionError extends BotWalletError {
  constructor(mintUrl: string, cause?: unknown) {
    super(`Failed to connect to mint: ${mintUrl}`, 'MINT_CONNECTION_ERROR');
    this.name = 'MintConnectionError';
    if (cause) this.cause = cause;
  }
}

export class InvalidTokenError extends BotWalletError {
  constructor(message = 'Invalid or malformed ecash token') {
    super(message, 'INVALID_TOKEN');
    this.name = 'InvalidTokenError';
  }
}
