import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { WebhookIngestionService } from '../../application/services/webhook-ingestion.service';

// Always 200 once the payload is persisted, even if processing later fails
// — non-200 only for signature failure (401, via DomainExceptionFilter) or
// malformed body (400). A 500 here would make Midtrans retry a bug that
// retrying cannot fix (.docs/05-api-roadmap.md §7).
@ApiTags('payments')
@Controller('payments/midtrans')
export class MidtransWebhookController {
  constructor(private readonly ingestion: WebhookIngestionService) {}

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handle(@Body() payload: Record<string, unknown>): Promise<{ received: boolean }> {
    const result = await this.ingestion.ingest(payload);
    if (result.isErr()) throw result.unwrapErr();
    return { received: true };
  }
}
