import { createHash, timingSafeEqual } from 'node:crypto';

// SHA-512 of order_id + status_code + gross_amount + server_key, compared in
// constant time (.docs/09-payments-ledger.md §2). An unverified payload is
// not evidence of anything.
export class SignatureVerifier {
  verify(params: { orderId: string; statusCode: string; grossAmount: string; serverKey: string; signatureKey: string }): boolean {
    const expected = createHash('sha512')
      .update(`${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(params.signatureKey, 'hex');
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
