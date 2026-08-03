import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { OrderItem } from './order-item.entity';
import { Order } from './order.aggregate';
import { OrderSource } from '../value-objects/order-source.vo';
import { DiscountApplication } from '../value-objects/discount-application.vo';
import { PlatformFee } from '../value-objects/platform-fee.vo';
import { StatusChangeActor } from '../value-objects/status-change-actor.vo';

const money = (amount: string) => Money.fromString(amount).unwrap();

const orderItem = (overrides: Partial<{ price: string; qty: number; productType: string }> = {}) =>
  OrderItem.create({
    productId: 'product-1',
    productNameSnapshot: 'Ebook Belajar Prisma',
    productTypeSnapshot: overrides.productType ?? 'digital',
    priceSnapshot: money(overrides.price ?? '100000'),
    hppSnapshot: null,
    qty: overrides.qty ?? 1,
  }).unwrap();

const createOrder = (overrides: Partial<{ price: string; qty: number }> = {}) => {
  const price = money(overrides.price ?? '100000');
  const fee = PlatformFee.create(500, price.percentageBasisPoints(500).unwrap()).unwrap();
  return Order.create({
    storeId: 'store-1',
    buyerId: 'buyer-1',
    source: OrderSource.selfCheckout(),
    items: [orderItem(overrides)],
    subtotal: price,
    discount: DiscountApplication.none(),
    total: price,
    fee,
  }).unwrap();
};

const markPaid = (order: Order, holdingUntil = new Date('2026-08-05T00:00:00.000Z')) =>
  order.markPaid({
    paidAt: new Date('2026-08-02T00:00:00.000Z'),
    method: 'qris',
    transactionId: 'txn-1',
    holdingUntil,
    actor: StatusChangeActor.system(),
  });

describe('Order aggregate', () => {
  describe('create', () => {
    it('rejects an empty basket', () => {
      const result = Order.create({
        storeId: 'store-1',
        buyerId: 'buyer-1',
        source: OrderSource.selfCheckout(),
        items: [],
        subtotal: Money.zero(),
        discount: DiscountApplication.none(),
        total: Money.zero(),
        fee: PlatformFee.create(500, Money.zero()).unwrap(),
      });
      expect(result.isErr()).toBe(true);
    });

    it('starts pending_payment with one history row and one OrderCreated event', () => {
      const order = createOrder();

      expect(order.status.value).toBe('pending_payment');
      expect(order.statusHistory).toHaveLength(1);
      expect(order.statusHistory[0]?.fromStatus).toBeNull();
      expect(order.statusHistory[0]?.toStatus).toBe('pending_payment');

      const events = order.pullDomainEvents();
      expect(events.map((event) => event.eventName)).toEqual(['ordering.order_created']);
    });

    it('generates a unique order number per order', () => {
      const first = createOrder();
      const second = createOrder();
      expect(first.orderNumber.value).not.toBe(second.orderNumber.value);
    });
  });

  describe('markPaid', () => {
    it('moves pending_payment -> paid -> holding, writing two history rows and one OrderPaid event', () => {
      const order = createOrder();
      order.pullDomainEvents();

      const holdingUntil = new Date('2026-08-05T00:00:00.000Z');
      const result = markPaid(order, holdingUntil);

      expect(result.isOk()).toBe(true);
      expect(order.status.value).toBe('holding');
      expect(order.holdingUntil).toEqual(holdingUntil);
      expect(order.paymentMethod).toBe('qris');
      expect(order.midtransTransactionId).toBe('txn-1');

      const newHistory = order.statusHistory.slice(1);
      expect(newHistory.map((entry) => [entry.fromStatus, entry.toStatus])).toEqual([
        ['pending_payment', 'paid'],
        ['paid', 'holding'],
      ]);

      const events = order.pullDomainEvents();
      expect(events.map((event) => event.eventName)).toEqual(['ordering.order_paid']);
    });

    it('is illegal from any state other than pending_payment', () => {
      const order = createOrder();
      markPaid(order);

      const result = markPaid(order);

      expect(result.isErr()).toBe(true);
      expect(order.status.value).toBe('holding');
    });
  });

  describe('cancel', () => {
    it('cancels a pending order and emits OrderCancelled', () => {
      const order = createOrder();
      order.pullDomainEvents();

      const result = order.cancel(StatusChangeActor.buyer('buyer-1'), 'changed my mind');

      expect(result.isOk()).toBe(true);
      expect(order.status.value).toBe('cancelled');
      expect(order.pullDomainEvents().map((event) => event.eventName)).toEqual(['ordering.order_cancelled']);
    });

    it('cannot cancel an order that is already paid', () => {
      const order = createOrder();
      markPaid(order);

      const result = order.cancel(StatusChangeActor.buyer('buyer-1'));

      expect(result.isErr()).toBe(true);
    });
  });

  describe('expire', () => {
    it('expires a pending order and emits OrderExpired', () => {
      const order = createOrder();
      order.pullDomainEvents();

      const result = order.expire();

      expect(result.isOk()).toBe(true);
      expect(order.status.value).toBe('expired');
      expect(order.pullDomainEvents().map((event) => event.eventName)).toEqual(['ordering.order_expired']);
    });

    it('a late webhook cannot resurrect an expired order', () => {
      const order = createOrder();
      order.expire();

      const result = markPaid(order);

      expect(result.isErr()).toBe(true);
      expect(order.status.value).toBe('expired');
    });
  });

  describe('release', () => {
    it('rejects releasing before the holding floor', () => {
      const order = createOrder();
      const holdingUntil = new Date('2026-08-05T00:00:00.000Z');
      markPaid(order, holdingUntil);

      const result = order.release({
        releasedAt: new Date('2026-08-03T00:00:00.000Z'),
        actor: StatusChangeActor.seller('seller-1'),
      });

      expect(result.isErr()).toBe(true);
      expect(order.status.value).toBe('holding');
    });

    it('releases once the holding floor has elapsed', () => {
      const order = createOrder();
      const holdingUntil = new Date('2026-08-05T00:00:00.000Z');
      markPaid(order, holdingUntil);
      order.pullDomainEvents();

      const result = order.release({
        releasedAt: new Date('2026-08-06T00:00:00.000Z'),
        actor: StatusChangeActor.seller('seller-1'),
      });

      expect(result.isOk()).toBe(true);
      expect(order.status.value).toBe('released');
      expect(order.pullDomainEvents().map((event) => event.eventName)).toEqual(['ordering.order_released']);
    });

    it('does not re-check the floor when releasing out of a dispute', () => {
      const order = createOrder();
      const holdingUntil = new Date('2026-08-05T00:00:00.000Z');
      markPaid(order, holdingUntil);
      order.dispute(StatusChangeActor.buyer('buyer-1'), 'item not as described');

      const result = order.release({
        releasedAt: new Date('2026-08-03T00:00:00.000Z'),
        actor: StatusChangeActor.admin('admin-1'),
      });

      expect(result.isOk()).toBe(true);
      expect(order.status.value).toBe('released');
    });
  });

  describe('refund', () => {
    it('refunding straight from holding needs no manual recovery', () => {
      const order = createOrder();
      markPaid(order);
      order.pullDomainEvents();

      const result = order.refund(StatusChangeActor.seller('seller-1'), 'buyer requested');

      expect(result.isOk()).toBe(true);
      expect(order.status.value).toBe('refunded');
      const events = order.pullDomainEvents();
      const event = events[0] as unknown as { requiresManualRecovery: boolean };
      expect(event.requiresManualRecovery).toBe(false);
    });

    it('refunding after a late dispute on a released order requires manual recovery', () => {
      const order = createOrder();
      const holdingUntil = new Date('2026-08-05T00:00:00.000Z');
      markPaid(order, holdingUntil);
      order.release({ releasedAt: new Date('2026-08-06T00:00:00.000Z'), actor: StatusChangeActor.system() });
      order.dispute(StatusChangeActor.buyer('buyer-1'), 'arrived broken');
      order.pullDomainEvents();

      const result = order.refund(StatusChangeActor.admin('admin-1'), 'resolved for buyer');

      expect(result.isOk()).toBe(true);
      const events = order.pullDomainEvents();
      const event = events[0] as unknown as { requiresManualRecovery: boolean };
      expect(event.requiresManualRecovery).toBe(true);
    });

    it('refunded is terminal — nothing can transition out of it', () => {
      const order = createOrder();
      markPaid(order);
      order.refund(StatusChangeActor.seller('seller-1'));

      const result = order.dispute(StatusChangeActor.buyer('buyer-1'));

      expect(result.isErr()).toBe(true);
    });
  });

  describe('every transition writes exactly one history row', () => {
    it('across a full lifecycle', () => {
      const order = createOrder();
      const holdingUntil = new Date('2026-08-05T00:00:00.000Z');

      markPaid(order, holdingUntil); // +2 rows (paid, holding)
      order.dispute(StatusChangeActor.buyer('buyer-1')); // +1 row
      order.release({ releasedAt: new Date('2026-08-06T00:00:00.000Z'), actor: StatusChangeActor.admin('admin-1') }); // +1 row

      // create (1) + markPaid (2) + dispute (1) + release (1) = 5
      expect(order.statusHistory).toHaveLength(5);
    });
  });
});
