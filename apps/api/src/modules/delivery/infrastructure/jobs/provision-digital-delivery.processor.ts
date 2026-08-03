import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { ProvisionDigitalDeliveryJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { DeliveryService } from '../../application/services/delivery.service';

@Injectable()
@Processor(QUEUE_NAMES.DELIVERY, { concurrency: 5 })
export class ProvisionDigitalDeliveryProcessor extends WorkerHost {
  constructor(private readonly delivery: DeliveryService) {
    super();
  }

  async process(job: Job<ProvisionDigitalDeliveryJob>): Promise<void> {
    await this.delivery.provisionForOrder(job.data.orderId);
  }
}
