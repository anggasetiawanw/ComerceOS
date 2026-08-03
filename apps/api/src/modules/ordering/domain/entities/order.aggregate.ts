import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { OrderNumber } from '../value-objects/order-number.vo';
import { OrderSource } from '../value-objects/order-source.vo';
import { OrderStatus, OrderStatusValue } from '../value-objects/order-status.vo';
import { PlatformFee } from '../value-objects/platform-fee.vo';
import { DiscountApplication } from '../value-objects/discount-application.vo';
import { StatusChangeActor } from '../value-objects/status-change-actor.vo';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { OrderTransitionPolicy } from '../services/order-transition.policy';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderPaidEvent } from '../events/order-paid.event';
import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { OrderExpiredEvent } from '../events/order-expired.event';
import { OrderReleasedEvent } from '../events/order-released.event';
import { OrderDisputedEvent } from '../events/order-disputed.event';
import { OrderRefundedEvent } from '../events/order-refunded.event';
import { EmptyBasketError, HoldingPeriodNotElapsedError, IllegalTransitionError } from '../errors/ordering.errors';

const TRANSITION_POLICY = new OrderTransitionPolicy();

export interface OrderProps {
  orderNumber: OrderNumber;
  storeId: string;
  buyerId: string;
  source: OrderSource;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: Money;
  discount: DiscountApplication;
  total: Money;
  fee: PlatformFee;
  paymentMethod: string | null;
  midtransTransactionId: string | null;
  shippingAddress: Record<string, unknown> | null;
  paidAt: Date | null;
  holdingUntil: Date | null;
  releasedAt: Date | null;
  statusHistory: OrderStatusHistory[];
  createdAt: Date;
}

export class Order extends AggregateRoot<OrderProps> {
  private constructor(props: OrderProps, id?: UniqueId) {
    super(props, id);
  }

  static create(params: {
    storeId: string;
    buyerId: string;
    source: OrderSource;
    items: OrderItem[];
    subtotal: Money;
    discount: DiscountApplication;
    total: Money;
    fee: PlatformFee;
  }): Result<Order, EmptyBasketError> {
    if (params.items.length === 0) {
      return Result.err(new EmptyBasketError());
    }

    const orderNumber = OrderNumber.generate();
    const order = new Order({
      orderNumber,
      storeId: params.storeId,
      buyerId: params.buyerId,
      source: params.source,
      status: OrderStatus.pendingPayment(),
      items: params.items,
      subtotal: params.subtotal,
      discount: params.discount,
      total: params.total,
      fee: params.fee,
      paymentMethod: null,
      midtransTransactionId: null,
      shippingAddress: null,
      paidAt: null,
      holdingUntil: null,
      releasedAt: null,
      statusHistory: [],
      createdAt: new Date(),
    });

    order.appendHistory(null, 'pending_payment', StatusChangeActor.system(), null);
    order.addDomainEvent(
      new OrderCreatedEvent(order.id, params.storeId, params.buyerId, orderNumber.value),
    );
    return Result.ok(order);
  }

  static reconstitute(props: OrderProps, id: UniqueId): Order {
    return new Order(props, id);
  }

  get orderNumber(): OrderNumber {
    return this.props.orderNumber;
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get buyerId(): string {
    return this.props.buyerId;
  }

  get source(): OrderSource {
    return this.props.source;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get items(): readonly OrderItem[] {
    return this.props.items;
  }

  get subtotal(): Money {
    return this.props.subtotal;
  }

  get discount(): DiscountApplication {
    return this.props.discount;
  }

  get total(): Money {
    return this.props.total;
  }

  get fee(): PlatformFee {
    return this.props.fee;
  }

  get paymentMethod(): string | null {
    return this.props.paymentMethod;
  }

  get midtransTransactionId(): string | null {
    return this.props.midtransTransactionId;
  }

  get shippingAddress(): Record<string, unknown> | null {
    return this.props.shippingAddress;
  }

  get paidAt(): Date | null {
    return this.props.paidAt;
  }

  get holdingUntil(): Date | null {
    return this.props.holdingUntil;
  }

  get releasedAt(): Date | null {
    return this.props.releasedAt;
  }

  get statusHistory(): readonly OrderStatusHistory[] {
    return this.props.statusHistory;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  belongsToStore(storeId: string): boolean {
    return this.props.storeId === storeId;
  }

  belongsToBuyer(buyerId: string): boolean {
    return this.props.buyerId === buyerId;
  }

  // paid -> holding happens automatically, in the same call, per
  // .docs/08-order-state-machine.md §3 row 4 — two history rows, one
  // OrderPaid event. holdingUntil is supplied by the caller (computed by
  // HoldingPeriodCalculator, which needs catalog/store data this aggregate
  // does not have).
  markPaid(params: {
    paidAt: Date;
    method: string;
    transactionId: string | null;
    holdingUntil: Date;
    actor: StatusChangeActor;
  }): Result<void, IllegalTransitionError> {
    const toPaid = this.transition('paid', params.actor);
    if (toPaid.isErr()) return toPaid;

    this.props.paymentMethod = params.method;
    this.props.midtransTransactionId = params.transactionId;
    this.props.paidAt = params.paidAt;

    const toHolding = this.transition('holding', StatusChangeActor.system());
    if (toHolding.isErr()) return toHolding;
    this.props.holdingUntil = params.holdingUntil;

    this.addDomainEvent(
      new OrderPaidEvent(this.id, this.props.storeId, this.props.buyerId, this.props.orderNumber.value, params.holdingUntil),
    );
    return Result.ok(undefined);
  }

  cancel(actor: StatusChangeActor, reason?: string): Result<void, IllegalTransitionError> {
    const result = this.transition('cancelled', actor, reason ?? null);
    if (result.isErr()) return result;
    this.addDomainEvent(new OrderCancelledEvent(this.id, this.props.storeId, this.props.orderNumber.value));
    return Result.ok(undefined);
  }

  expire(): Result<void, IllegalTransitionError> {
    const result = this.transition('expired', StatusChangeActor.system());
    if (result.isErr()) return result;
    this.addDomainEvent(new OrderExpiredEvent(this.id, this.props.storeId, this.props.orderNumber.value));
    return Result.ok(undefined);
  }

  // The platform floor applies even when releasing from 'holding' via the
  // manual seller path — a UI bug cannot produce an early release
  // (.docs/08-order-state-machine.md §4). Releasing out of 'disputed'
  // (dispute resolved in the seller's favor) does not re-check the floor —
  // the resolution itself is the authority at that point.
  release(params: { releasedAt: Date; actor: StatusChangeActor; forced?: boolean }): Result<void, IllegalTransitionError | HoldingPeriodNotElapsedError> {
    const from = this.props.status.value;
    if (from === 'holding' && this.props.holdingUntil && params.releasedAt < this.props.holdingUntil) {
      return Result.err(new HoldingPeriodNotElapsedError(this.props.holdingUntil));
    }

    const result = this.transition('released', params.actor);
    if (result.isErr()) return result;
    this.props.releasedAt = params.releasedAt;
    this.addDomainEvent(
      new OrderReleasedEvent(this.id, this.props.storeId, this.props.orderNumber.value, params.forced ?? false),
    );
    return Result.ok(undefined);
  }

  dispute(actor: StatusChangeActor, reason?: string): Result<void, IllegalTransitionError> {
    const result = this.transition('disputed', actor, reason ?? null);
    if (result.isErr()) return result;
    this.addDomainEvent(new OrderDisputedEvent(this.id, this.props.storeId, this.props.orderNumber.value, reason ?? null));
    return Result.ok(undefined);
  }

  // Covers both refund paths (transition table rows 12 and 14): straight
  // from 'holding' (never released — requiresManualRecovery is always
  // false), and from 'disputed' after a late dispute on an already-released
  // order (releasedAt is set — funds already mixed into the seller's
  // general balance, so recovery becomes a manual matter, .docs/09 §8).
  refund(actor: StatusChangeActor, reason?: string): Result<void, IllegalTransitionError> {
    const requiresManualRecovery = this.props.releasedAt !== null;
    const result = this.transition('refunded', actor, reason ?? null);
    if (result.isErr()) return result;
    this.addDomainEvent(
      new OrderRefundedEvent(this.id, this.props.storeId, this.props.orderNumber.value, requiresManualRecovery),
    );
    return Result.ok(undefined);
  }

  private transition(
    to: OrderStatusValue,
    actor: StatusChangeActor,
    reason: string | null = null,
  ): Result<void, IllegalTransitionError> {
    const from = this.props.status.value;
    if (!TRANSITION_POLICY.isLegal(from, to, actor.type)) {
      return Result.err(new IllegalTransitionError(from, to));
    }
    this.props.status = OrderStatus.of(to);
    this.appendHistory(from, to, actor, reason);
    return Result.ok(undefined);
  }

  private appendHistory(
    from: OrderStatusValue | null,
    to: OrderStatusValue,
    actor: StatusChangeActor,
    reason: string | null,
  ): void {
    this.props.statusHistory = [
      ...this.props.statusHistory,
      OrderStatusHistory.record({ fromStatus: from, toStatus: to, actor, reason }),
    ];
  }
}
