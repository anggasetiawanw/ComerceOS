import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { OrderReadService } from '../../../ordering/application/services/order-read.service';
import { InvoiceReadService } from '../../application/services/invoice-read.service';
import { InvoicePdfResponseDto } from '../dto/responses/invoice-response.dto';

@ApiTags('invoices')
@Controller('me/orders')
export class BuyerInvoicesController {
  constructor(
    private readonly orderReads: OrderReadService,
    private readonly invoiceReads: InvoiceReadService,
  ) {}

  @Get(':id/invoice')
  async getInvoicePdfUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') orderId: string,
  ): Promise<InvoicePdfResponseDto> {
    const order = unwrapOrThrow(await this.orderReads.getForBuyer(user.id, orderId));
    const invoice = unwrapOrThrow(await this.invoiceReads.getByOrderId(order.id));
    const { url, expiresAt } = unwrapOrThrow(await this.invoiceReads.getSignedPdfUrlForOrder(invoice));
    return InvoicePdfResponseDto.of(url, expiresAt);
  }
}
