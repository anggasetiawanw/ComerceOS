import { createHash } from 'node:crypto';
import { SignatureVerifier } from './signature-verifier';

describe('SignatureVerifier', () => {
  const verifier = new SignatureVerifier();
  const base = { orderId: 'ORD-260802-AB3XZ9', statusCode: '200', grossAmount: '100000.00', serverKey: 'server-key' };

  const validSignature = (params: typeof base) =>
    createHash('sha512')
      .update(`${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`)
      .digest('hex');

  it('accepts a correctly computed signature', () => {
    expect(verifier.verify({ ...base, signatureKey: validSignature(base) })).toBe(true);
  });

  it('rejects a tampered signature of the same length', () => {
    const signature = validSignature(base);
    const flippedLastChar = signature.slice(0, -1) + (signature.endsWith('a') ? 'b' : 'a');
    expect(verifier.verify({ ...base, signatureKey: flippedLastChar })).toBe(false);
  });

  it('rejects a signature of the wrong length', () => {
    expect(verifier.verify({ ...base, signatureKey: 'too-short' })).toBe(false);
  });

  it('rejects when the gross amount used to compute the signature differs from the claim', () => {
    const signature = validSignature(base);
    expect(verifier.verify({ ...base, grossAmount: '999999.00', signatureKey: signature })).toBe(false);
  });

  it('rejects an unverified payload outright (empty signature)', () => {
    expect(verifier.verify({ ...base, signatureKey: '' })).toBe(false);
  });
});
