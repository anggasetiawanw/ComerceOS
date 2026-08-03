export type MappedPaymentStatus = 'settled' | 'pending' | 'failed' | 'expired' | 'refund_completed' | 'unknown';

// Midtrans vocabulary -> our domain outcome. capture + fraud_status=challenge
// is the trap: it looks successful and is not, so it maps to 'pending', not
// 'settled' (.docs/09-payments-ledger.md §2).
export class PaymentStatusMapper {
  map(transactionStatus: string, fraudStatus: string | null): MappedPaymentStatus {
    if (transactionStatus === 'capture') {
      return fraudStatus === 'accept' ? 'settled' : 'pending';
    }

    switch (transactionStatus) {
      case 'settlement':
        return 'settled';
      case 'pending':
        return 'pending';
      case 'deny':
      case 'cancel':
        return 'failed';
      case 'expire':
        return 'expired';
      case 'refund':
      case 'partial_refund':
        return 'refund_completed';
      default:
        return 'unknown';
    }
  }
}
