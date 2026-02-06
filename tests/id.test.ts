import { describe, it, expect } from 'vitest';
import { generateWalletId, generateTxId } from '../src/utils/id.js';

describe('generateWalletId', () => {
  it('starts with bw_ prefix', () => {
    expect(generateWalletId()).toMatch(/^bw_[0-9a-f]{16}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateWalletId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateTxId', () => {
  it('starts with tx_ prefix', () => {
    expect(generateTxId()).toMatch(/^tx_[0-9a-f]{16}$/);
  });
});
