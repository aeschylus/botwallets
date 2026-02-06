import { Mint, Wallet, getEncodedToken, getDecodedToken } from '@cashu/cashu-ts';
import type { Proof, MintQuoteBolt11Response, MeltQuoteBolt11Response } from '@cashu/cashu-ts';
import { MintConnectionError, InvalidTokenError } from '../errors.js';

export class CashuEngine {
  private mint: Mint;
  private wallet: Wallet;
  private loaded = false;

  constructor(mintUrl: string, unit: string) {
    this.mint = new Mint(mintUrl);
    this.wallet = new Wallet(this.mint, { unit });
  }

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      await this.wallet.loadMint();
      this.loaded = true;
    } catch (err) {
      throw new MintConnectionError(this.mint.mintUrl, err);
    }
  }

  async send(
    amount: number,
    proofs: Proof[],
  ): Promise<{ keep: Proof[]; send: Proof[] }> {
    await this.ensureLoaded();
    const result = await this.wallet.send(amount, proofs, { includeFees: true });
    return { keep: result.keep, send: result.send };
  }

  async receive(tokenString: string): Promise<Proof[]> {
    await this.ensureLoaded();
    try {
      return await this.wallet.receive(tokenString);
    } catch (err) {
      if (err instanceof Error && err.message.includes('token')) {
        throw new InvalidTokenError(err.message);
      }
      throw err;
    }
  }

  async createMintQuote(amount: number): Promise<MintQuoteBolt11Response> {
    await this.ensureLoaded();
    return this.wallet.createMintQuoteBolt11(amount);
  }

  async checkMintQuote(quoteId: string): Promise<MintQuoteBolt11Response> {
    await this.ensureLoaded();
    return this.wallet.checkMintQuoteBolt11(quoteId);
  }

  async mintProofs(amount: number, quote: string | MintQuoteBolt11Response): Promise<Proof[]> {
    await this.ensureLoaded();
    return this.wallet.mintProofsBolt11(amount, quote);
  }

  async createMeltQuote(invoice: string): Promise<MeltQuoteBolt11Response> {
    await this.ensureLoaded();
    return this.wallet.createMeltQuoteBolt11(invoice);
  }

  async meltProofs(
    quote: MeltQuoteBolt11Response,
    proofs: Proof[],
  ): Promise<{ quote: MeltQuoteBolt11Response; change: Proof[] }> {
    await this.ensureLoaded();
    const result = await this.wallet.meltProofsBolt11(quote, proofs);
    return {
      quote: result.quote as MeltQuoteBolt11Response,
      change: result.change,
    };
  }

  encodeToken(mintUrl: string, proofs: Proof[], unit: string): string {
    return getEncodedToken({ mint: mintUrl, proofs, unit });
  }

  decodeToken(tokenString: string): { mint: string; proofs: Proof[] } {
    try {
      const token = getDecodedToken(tokenString);
      return { mint: token.mint, proofs: token.proofs };
    } catch {
      throw new InvalidTokenError();
    }
  }
}
