import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { DispatchWithdrawalNotificationJob, SendEmailJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { SendEmailService } from '../../application/services/send-email.service';
import { WithdrawalNotificationService } from '../../../ledger/application/services/withdrawal-notification.service';

type NotificationJobData = SendEmailJob | DispatchWithdrawalNotificationJob;

const isSendEmailJob = (data: NotificationJobData): data is SendEmailJob => 'deliveryId' in data;

// @nestjs/bullmq creates one Worker per @Processor-decorated class — two
// classes on the same queue name would compete for jobs regardless of job
// name (Sprint 6's lesson, .docs/12-roadmap-sprints.md). send-email and
// dispatch-withdrawal-notification both run on the `notification` queue, so
// they share this one processor, dispatched on job.name — same pattern as
// LedgerQueueProcessor/OrderQueueProcessor.
@Injectable()
@Processor(QUEUE_NAMES.NOTIFICATION, { concurrency: 10 })
export class NotificationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationQueueProcessor.name);

  constructor(
    private readonly sendEmail: SendEmailService,
    private readonly withdrawalNotifications: WithdrawalNotificationService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.SEND_EMAIL: {
        if (!isSendEmailJob(job.data)) {
          this.logger.warn(`Job "${job.id}" named "${job.name}" has an unexpected payload shape`);
          return;
        }
        await this.sendEmail.send(job.data.deliveryId);
        return;
      }
      case JOB_NAMES.DISPATCH_WITHDRAWAL_NOTIFICATION: {
        if (isSendEmailJob(job.data)) {
          this.logger.warn(`Job "${job.id}" named "${job.name}" has an unexpected payload shape`);
          return;
        }
        await this.withdrawalNotifications.dispatch(job.data);
        return;
      }
      default:
        this.logger.warn(`Unknown job name "${job.name}" on the notification queue`);
    }
  }
}
