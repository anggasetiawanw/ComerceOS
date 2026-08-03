import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { InvoiceService } from '../../application/services/invoice.service';
import { InvoiceDeliveryService } from '../../application/services/invoice-delivery.service';

interface GenerateInvoiceJobData {
  orderId: string;
}

interface DeliverInvoiceJobData {
  invoiceId: string;
}

const isGenerateInvoiceJobData = (data: unknown): data is GenerateInvoiceJobData =>
  typeof data === 'object' && data !== null && typeof (data as Record<string, unknown>).orderId === 'string';

const isDeliverInvoiceJobData = (data: unknown): data is DeliverInvoiceJobData =>
  typeof data === 'object' && data !== null && typeof (data as Record<string, unknown>).invoiceId === 'string';

// @nestjs/bullmq creates one BullMQ Worker per @Processor-decorated class —
// two Worker instances on the same queue name would compete for jobs
// regardless of job name, silently misrouting them. Both invoice job types
// (generate-invoice, deliver-invoice) are handled here, dispatched on
// job.name, matching the same fix applied to the `ledger` and `order`
// queues.
@Injectable()
@Processor(QUEUE_NAMES.INVOICE, { concurrency: 2 })
export class InvoiceQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceQueueProcessor.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoiceDelivery: InvoiceDeliveryService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.GENERATE_INVOICE: {
        if (!isGenerateInvoiceJobData(job.data)) {
          throw new Error('Malformed generate-invoice job payload');
        }
        const generated = await this.invoiceService.generateForOrder(job.data.orderId);
        if (generated.isErr()) throw generated.unwrapErr();

        const rendered = await this.invoiceService.renderAndUpload(generated.unwrap().id);
        if (rendered.isErr()) throw rendered.unwrapErr();
        return;
      }
      case JOB_NAMES.DELIVER_INVOICE: {
        if (!isDeliverInvoiceJobData(job.data)) {
          throw new Error('Malformed deliver-invoice job payload');
        }
        const result = await this.invoiceDelivery.deliverInvoice(job.data.invoiceId);
        if (result.isErr()) throw result.unwrapErr();
        return;
      }
      default:
        this.logger.warn(`Unknown job name "${job.name}" on the invoice queue`);
    }
  }
}
