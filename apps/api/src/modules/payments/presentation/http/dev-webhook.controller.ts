import { createHash, randomUUID } from 'node:crypto';
import { Body, Controller, Inject, NotFoundException, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { ORDER_REPOSITORY, OrderRepository } from '../../../ordering/domain/repositories/order.repository';
import { WebhookIngestionService } from '../../application/services/webhook-ingestion.service';
import { SimulateWebhookDto } from '../dto/requests/simulate-webhook.dto';

// Dev-only: drives a real order through the real webhook ingestion +
// processing pipeline without sandbox keys or ngrok. Builds a signature the
// same way the ingestion service verifies it (both use
// config.midtransServerKey, which is blank in stub mode), so this exercises
// the actual signature-verification code path rather than bypassing it.
// 404s outside development or once real Midtrans keys are configured.
@ApiTags('payments')
@Controller('payments/dev')
export class DevWebhookController {
  constructor(
    private readonly ingestion: WebhookIngestionService,
    private readonly config: AppConfigService,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  @Public()
  @Post('simulate-webhook')
  async simulate(@Body() dto: SimulateWebhookDto): Promise<{ received: boolean }> {
    if (this.config.isProduction || this.config.isMidtransConfigured) {
      throw new NotFoundException();
    }

    const order = await this.orders.findByOrderNumber(dto.orderNumber);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const statusCode = '200';
    const grossAmount = order.total.toString();
    const serverKey = this.config.midtransServerKey;
    const signatureKey = createHash('sha512')
      .update(`${dto.orderNumber}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex');

    const transactionStatus = dto.transactionStatus ?? 'settlement';
    const payload = {
      order_id: dto.orderNumber,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: transactionStatus,
      fraud_status: dto.fraudStatus ?? (transactionStatus === 'settlement' ? 'accept' : null),
      transaction_id: randomUUID(),
      payment_type: 'stub',
    };

    const result = await this.ingestion.ingest(payload);
    if (result.isErr()) throw result.unwrapErr();
    return { received: true };
  }
}
