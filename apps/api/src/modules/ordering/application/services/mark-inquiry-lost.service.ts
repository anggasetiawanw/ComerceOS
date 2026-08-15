import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { Inquiry } from '../../domain/entities/inquiry.aggregate';
import { INQUIRY_REPOSITORY, InquiryRepository } from '../../domain/repositories/inquiry.repository';
import {
  InquiryAlreadyConvertedError,
  InquiryAlreadyLostError,
  InquiryNotFoundError,
} from '../../domain/errors/ordering.errors';

type MarkInquiryLostError = InquiryNotFoundError | InquiryAlreadyConvertedError | InquiryAlreadyLostError;

@Injectable()
export class MarkInquiryLostService {
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
  ) {}

  async execute(inquiryId: string, expectedStoreId: string): Promise<Result<Inquiry, MarkInquiryLostError>> {
    const inquiry = await this.inquiries.findById(inquiryId);
    if (!inquiry || !inquiry.belongsToStore(expectedStoreId)) {
      return Result.err(new InquiryNotFoundError());
    }

    const result = inquiry.markLost();
    if (result.isErr()) return Result.err(result.unwrapErr());

    await this.transactionManager.runInTransaction(async () => {
      await this.inquiries.save(inquiry);
      await this.outbox.enqueueAll(inquiry.pullDomainEvents());
    });

    return Result.ok(inquiry);
  }
}
