import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  CreateSnapTransactionInput,
  PaymentGateway,
  SnapTransaction,
} from '../../../ordering/application/ports/payment-gateway.port';

export const STUB_TOKEN_PREFIX = 'stub-';

// Selected when MIDTRANS_SERVER_KEY/MIDTRANS_CLIENT_KEY are blank, so
// checkout and the order state machine are testable end to end without
// sandbox keys or ngrok. Paired with POST /payments/dev/simulate-webhook
// (guarded to non-production) to drive an order to 'paid' without a real
// Midtrans notification.
@Injectable()
export class StubSnapGateway implements PaymentGateway {
  private readonly logger = new Logger(StubSnapGateway.name);

  isConfigured(): boolean {
    return true;
  }

  async createSnapTransaction(input: CreateSnapTransactionInput): Promise<SnapTransaction> {
    this.logger.debug(`Stub Snap transaction created for order ${input.orderNumber}`);
    return Promise.resolve({ token: `${STUB_TOKEN_PREFIX}${randomUUID()}`, redirectUrl: '' });
  }
}
