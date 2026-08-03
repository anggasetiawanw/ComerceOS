import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import {
  CreateSnapTransactionInput,
  PaymentGateway,
  SnapTransaction,
} from '../../../ordering/application/ports/payment-gateway.port';
import { SnapTokenCreationFailedError } from '../../domain/errors/payments.errors';

interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

// Real Midtrans Snap adapter. item_details must sum exactly to gross_amount
// or Midtrans rejects the transaction — discounts go in as a negative line
// item (.docs/09-payments-ledger.md §1), which CheckoutService already
// builds. order_id is our order_number, never the internal UUID.
@Injectable()
export class MidtransSnapGateway implements PaymentGateway {
  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return this.config.isMidtransConfigured;
  }

  async createSnapTransaction(input: CreateSnapTransactionInput): Promise<SnapTransaction> {
    const baseUrl = this.config.midtransIsProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';
    const authHeader = `Basic ${Buffer.from(`${this.config.midtransServerKey}:`).toString('base64')}`;

    const body = {
      transaction_details: {
        order_id: input.orderNumber,
        gross_amount: Number(input.grossAmount.toString()),
      },
      customer_details: {
        first_name: input.buyerName,
        email: input.buyerEmail,
        phone: input.buyerPhone ?? undefined,
      },
      item_details: input.items.map((item) => ({
        id: item.id,
        name: item.name.slice(0, 50),
        price: Number(item.price.toString()),
        quantity: item.quantity,
      })),
      expiry: { duration: input.expiryHours, unit: 'hours' },
      callbacks: { finish: input.finishRedirectUrl },
    };

    const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: authHeader },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new SnapTokenCreationFailedError(`Midtrans returned ${response.status}: ${text}`);
    }

    const payload = (await response.json()) as MidtransSnapResponse;
    return { token: payload.token, redirectUrl: payload.redirect_url };
  }
}
