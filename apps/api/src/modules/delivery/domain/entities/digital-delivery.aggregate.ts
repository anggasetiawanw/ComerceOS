import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { DownloadAllowance } from '../value-objects/download-allowance.vo';
import { DeliveryProvisionedEvent } from '../events/delivery-provisioned.event';
import { FileDownloadedEvent } from '../events/file-downloaded.event';
import { DownloadLimitReachedEvent } from '../events/download-limit-reached.event';
import { DownloadLimitReachedError, InvalidDeliveryError } from '../errors/delivery.errors';

export interface DigitalDeliveryProps {
  orderItemId: string;
  filePath: string;
  allowance: DownloadAllowance;
  expiresAt: Date;
  createdAt: Date;
}

export class DigitalDelivery extends AggregateRoot<DigitalDeliveryProps> {
  private constructor(props: DigitalDeliveryProps, id?: UniqueId) {
    super(props, id);
  }

  static provision(params: {
    orderItemId: string;
    filePath: string;
    maxDownloads: number;
    expiresAt: Date;
  }): Result<DigitalDelivery, InvalidDeliveryError> {
    const allowanceResult = DownloadAllowance.create(0, params.maxDownloads);
    if (allowanceResult.isErr()) {
      return Result.err(new InvalidDeliveryError(allowanceResult.unwrapErr().message));
    }

    const delivery = new DigitalDelivery({
      orderItemId: params.orderItemId,
      filePath: params.filePath,
      allowance: allowanceResult.unwrap(),
      expiresAt: params.expiresAt,
      createdAt: new Date(),
    });
    delivery.addDomainEvent(new DeliveryProvisionedEvent(delivery.id, params.orderItemId));
    return Result.ok(delivery);
  }

  static reconstitute(props: DigitalDeliveryProps, id: UniqueId): DigitalDelivery {
    return new DigitalDelivery(props, id);
  }

  get orderItemId(): string {
    return this.props.orderItemId;
  }

  get filePath(): string {
    return this.props.filePath;
  }

  get allowance(): DownloadAllowance {
    return this.props.allowance;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // Increments the counter before the URL is ever issued — a failed
  // issuance still burns an allowance (conservative), rather than letting a
  // buyer farm unlimited URLs by aborting after the signed URL is minted
  // (.docs/04-entity-design.md §8).
  recordDownload(): Result<void, DownloadLimitReachedError> {
    const result = this.props.allowance.increment();
    if (result.isErr()) {
      this.addDomainEvent(new DownloadLimitReachedEvent(this.id, this.props.orderItemId));
      return Result.err(new DownloadLimitReachedError());
    }
    this.props.allowance = result.unwrap();
    this.addDomainEvent(new FileDownloadedEvent(this.id, this.props.orderItemId));
    return Result.ok(undefined);
  }
}
