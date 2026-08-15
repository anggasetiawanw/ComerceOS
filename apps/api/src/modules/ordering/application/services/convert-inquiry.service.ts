import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { MoneyError } from '../../../../shared/kernel/value-objects/money.vo';
import { Order } from '../../domain/entities/order.aggregate';
import { INQUIRY_REPOSITORY, InquiryRepository } from '../../domain/repositories/inquiry.repository';
import {
  EmptyBasketError,
  InquiryAlreadyConvertedError,
  InquiryAlreadyLostError,
  InquiryNotFoundError,
  InvalidOrderError,
  ProductNotFoundForStoreError,
  StoreNotFoundForOrderError,
} from '../../domain/errors/ordering.errors';
import { CreateManualOrderItemInput, CreateManualOrderService } from './create-manual-order.service';

type ConvertInquiryError =
  | InquiryNotFoundError
  | InquiryAlreadyConvertedError
  | InquiryAlreadyLostError
  | EmptyBasketError
  | InvalidOrderError
  | StoreNotFoundForOrderError
  | ProductNotFoundForStoreError
  | MoneyError;

// Conversion creates the manual order with inquiryId set, then marks the
// inquiry converted in the same transaction — Inquiry.convert()'s own guard
// (one conversion only, cannot convert when lost) is the invariant this
// service exists to enforce end to end.
@Injectable()
export class ConvertInquiryService {
  constructor(
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    private readonly createManualOrder: CreateManualOrderService,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
  ) {}

  async execute(
    inquiryId: string,
    sellerId: string,
    opts: {
      expectedStoreId: string;
      items: CreateManualOrderItemInput[];
      buyerEmail: string;
      buyerName: string;
      buyerPhone: string | null;
    },
  ): Promise<Result<Order, ConvertInquiryError>> {
    const inquiry = await this.inquiries.findById(inquiryId);
    if (!inquiry || !inquiry.belongsToStore(opts.expectedStoreId)) {
      return Result.err(new InquiryNotFoundError());
    }
    if (inquiry.status.value !== 'open') {
      return Result.err(
        inquiry.status.value === 'converted' ? new InquiryAlreadyConvertedError() : new InquiryAlreadyLostError(),
      );
    }

    const orderResult = await this.createManualOrder.execute(opts.expectedStoreId, sellerId, {
      items: opts.items,
      buyerEmail: opts.buyerEmail,
      buyerName: opts.buyerName,
      buyerPhone: opts.buyerPhone,
      inquiryId,
    });
    if (orderResult.isErr()) return Result.err(orderResult.unwrapErr());
    const order = orderResult.unwrap();

    const convertResult = inquiry.convert(order.id);
    if (convertResult.isErr()) return Result.err(convertResult.unwrapErr());

    await this.transactionManager.runInTransaction(async () => {
      await this.inquiries.save(inquiry);
      await this.outbox.enqueueAll(inquiry.pullDomainEvents());
    });

    return Result.ok(order);
  }
}
