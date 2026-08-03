import { PaymentStatusMapper } from './payment-status.mapper';

describe('PaymentStatusMapper', () => {
  const mapper = new PaymentStatusMapper();

  it('maps capture + fraud_status=accept to settled', () => {
    expect(mapper.map('capture', 'accept')).toBe('settled');
  });

  it('maps capture + fraud_status=challenge to pending — the trap that looks successful and is not', () => {
    expect(mapper.map('capture', 'challenge')).toBe('pending');
  });

  it('maps capture + fraud_status=deny to pending, never settled', () => {
    expect(mapper.map('capture', 'deny')).toBe('pending');
  });

  it('maps settlement to settled regardless of fraud_status', () => {
    expect(mapper.map('settlement', null)).toBe('settled');
  });

  it('maps pending to pending', () => {
    expect(mapper.map('pending', null)).toBe('pending');
  });

  it('maps deny and cancel to failed', () => {
    expect(mapper.map('deny', null)).toBe('failed');
    expect(mapper.map('cancel', null)).toBe('failed');
  });

  it('maps expire to expired', () => {
    expect(mapper.map('expire', null)).toBe('expired');
  });

  it('maps refund and partial_refund to refund_completed', () => {
    expect(mapper.map('refund', null)).toBe('refund_completed');
    expect(mapper.map('partial_refund', null)).toBe('refund_completed');
  });

  it('maps an unrecognized status to unknown', () => {
    expect(mapper.map('something_new', null)).toBe('unknown');
  });
});
