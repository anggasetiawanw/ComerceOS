import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Result } from '../../../../shared/kernel/result';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { InvalidOrderError } from '../errors/ordering.errors';

export interface OrderItemProps {
  productId: string;
  productNameSnapshot: string;
  productTypeSnapshot: string;
  priceSnapshot: Money;
  hppSnapshot: Money | null;
  qty: number;
  createdAt: Date;
}

// Immutable once created — item snapshots never change after the order is
// placed, even if the source product is later edited (.docs/04-entity-design.md §4).
export class OrderItem extends Entity<OrderItemProps> {
  private constructor(props: OrderItemProps, id?: UniqueId) {
    super(props, id);
  }

  static create(params: {
    productId: string;
    productNameSnapshot: string;
    productTypeSnapshot: string;
    priceSnapshot: Money;
    hppSnapshot: Money | null;
    qty: number;
  }): Result<OrderItem, InvalidOrderError> {
    if (!Number.isInteger(params.qty) || params.qty <= 0) {
      return Result.err(new InvalidOrderError(`Order item quantity must be a positive integer, got ${params.qty}`));
    }
    return Result.ok(
      new OrderItem({
        productId: params.productId,
        productNameSnapshot: params.productNameSnapshot,
        productTypeSnapshot: params.productTypeSnapshot,
        priceSnapshot: params.priceSnapshot,
        hppSnapshot: params.hppSnapshot,
        qty: params.qty,
        createdAt: new Date(),
      }),
    );
  }

  static reconstitute(props: OrderItemProps, id: UniqueId): OrderItem {
    return new OrderItem(props, id);
  }

  get productId(): string {
    return this.props.productId;
  }

  get productNameSnapshot(): string {
    return this.props.productNameSnapshot;
  }

  get productTypeSnapshot(): string {
    return this.props.productTypeSnapshot;
  }

  get priceSnapshot(): Money {
    return this.props.priceSnapshot;
  }

  get hppSnapshot(): Money | null {
    return this.props.hppSnapshot;
  }

  get qty(): number {
    return this.props.qty;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  lineTotal(): Money {
    return this.props.priceSnapshot.multiply(this.props.qty).unwrap();
  }
}
