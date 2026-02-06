import { describe, it, expect } from 'vitest';
import {
  BotWalletError,
  InsufficientBalanceError,
  MintConnectionError,
  InvalidTokenError,
} from '../src/errors.js';

describe('BotWalletError', () => {
  it('has code and message', () => {
    const err = new BotWalletError('test', 'TEST_CODE');
    expect(err.message).toBe('test');
    expect(err.code).toBe('TEST_CODE');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('InsufficientBalanceError', () => {
  it('includes required and available amounts', () => {
    const err = new InsufficientBalanceError(100, 50);
    expect(err.code).toBe('INSUFFICIENT_BALANCE');
    expect(err.required).toBe(100);
    expect(err.available).toBe(50);
    expect(err.message).toContain('100');
    expect(err.message).toContain('50');
    expect(err).toBeInstanceOf(BotWalletError);
  });
});

describe('MintConnectionError', () => {
  it('includes mint URL', () => {
    const err = new MintConnectionError('https://mint.example.com');
    expect(err.code).toBe('MINT_CONNECTION_ERROR');
    expect(err.message).toContain('https://mint.example.com');
  });
});

describe('InvalidTokenError', () => {
  it('has default message', () => {
    const err = new InvalidTokenError();
    expect(err.code).toBe('INVALID_TOKEN');
    expect(err.message).toContain('Invalid');
  });
});
