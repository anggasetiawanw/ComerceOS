import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { InquiryStatus } from '../value-objects/inquiry-status.vo';
import { InquiryCreatedEvent } from '../events/inquiry-created.event';
import { InquiryConvertedEvent } from '../events/inquiry-converted.event';
import { InquiryMarkedLostEvent } from '../events/inquiry-marked-lost.event';
import { InquiryAlreadyConvertedError, InquiryAlreadyLostError } from '../errors/ordering.errors';

export interface InquiryProps {
  storeId: string;
  productId: string | null;
  buyerId: string | null;
  status: InquiryStatus;
  convertedOrderId: string | null;
  createdAt: Date;
}

// .docs/04-entity-design.md §3: a separate aggregate root, not folded into
// Order — an inquiry has no money, no items, and often never converts.
// Guards: one conversion only, cannot convert when lost, cannot mark lost
// once converted.
export class Inquiry extends AggregateRoot<InquiryProps> {
  private constructor(props: InquiryProps, id?: UniqueId) {
    super(props, id);
  }

  static create(params: { storeId: string; productId: string | null; buyerId: string | null }): Inquiry {
    const inquiry = new Inquiry({
      storeId: params.storeId,
      productId: params.productId,
      buyerId: params.buyerId,
      status: InquiryStatus.open(),
      convertedOrderId: null,
      createdAt: new Date(),
    });
    inquiry.addDomainEvent(new InquiryCreatedEvent(inquiry.id, params.storeId, params.productId, params.buyerId));
    return inquiry;
  }

  static reconstitute(props: InquiryProps, id: UniqueId): Inquiry {
    return new Inquiry(props, id);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get productId(): string | null {
    return this.props.productId;
  }

  get buyerId(): string | null {
    return this.props.buyerId;
  }

  get status(): InquiryStatus {
    return this.props.status;
  }

  get convertedOrderId(): string | null {
    return this.props.convertedOrderId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  belongsToStore(storeId: string): boolean {
    return this.props.storeId === storeId;
  }

  convert(orderId: string): Result<void, InquiryAlreadyConvertedError | InquiryAlreadyLostError> {
    if (this.props.status.value === 'converted') {
      return Result.err(new InquiryAlreadyConvertedError());
    }
    if (this.props.status.value === 'lost') {
      return Result.err(new InquiryAlreadyLostError());
    }

    this.props.status = InquiryStatus.create('converted').unwrap();
    this.props.convertedOrderId = orderId;
    this.addDomainEvent(new InquiryConvertedEvent(this.id, this.props.storeId, orderId));
    return Result.ok(undefined);
  }

  markLost(): Result<void, InquiryAlreadyConvertedError | InquiryAlreadyLostError> {
    if (this.props.status.value === 'converted') {
      return Result.err(new InquiryAlreadyConvertedError());
    }
    if (this.props.status.value === 'lost') {
      return Result.err(new InquiryAlreadyLostError());
    }

    this.props.status = InquiryStatus.create('lost').unwrap();
    this.addDomainEvent(new InquiryMarkedLostEvent(this.id, this.props.storeId));
    return Result.ok(undefined);
  }
}
