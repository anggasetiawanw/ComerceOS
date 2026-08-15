import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { OrderFactory } from './order.factory';
import { OrderPricingService } from '../services/order-pricing.service';

describe('OrderFactory.fromManualCreation', () => {
  const factory = new OrderFactory(new OrderPricingService());
  const basicLine = {
    productId: 'product-1',
    productNameSnapshot: 'Produk A',
    productTypeSnapshot: 'digital',
    price: Money.fromRupiah(100_000n).unwrap(),
    hpp: null,
    qty: 1,
    priceOverride: null,
  };

  it('rejects an empty basket', () => {
    const result = factory.fromManualCreation({
      storeId: 'store-1',
      buyerId: 'buyer-1',
      items: [],
      feeRateBasisPoints: 500,
    });
    expect(result.isErr()).toBe(true);
  });

  it('uses the product price when no override is given', () => {
    const result = factory.fromManualCreation({
      storeId: 'store-1',
      buyerId: 'buyer-1',
      items: [basicLine],
      feeRateBasisPoints: 500,
    });
    expect(result.isOk()).toBe(true);
    const order = result.unwrap();
    expect(order.items[0]?.priceSnapshot.toString()).toBe('100000');
    expect(order.subtotal.toString()).toBe('100000');
    expect(order.source.value).toBe('manual');
  });

  it('uses the price override when supplied, including below-HPP prices', () => {
    const overriddenLine = {
      ...basicLine,
      hpp: Money.fromRupiah(80_000n).unwrap(),
      priceOverride: Money.fromRupiah(50_000n).unwrap(),
    };
    const result = factory.fromManualCreation({
      storeId: 'store-1',
      buyerId: 'buyer-1',
      items: [overriddenLine],
      feeRateBasisPoints: 500,
    });
    expect(result.isOk()).toBe(true);
    const order = result.unwrap();
    expect(order.items[0]?.priceSnapshot.toString()).toBe('50000');
    expect(order.subtotal.toString()).toBe('50000');
  });

  it('sets inquiryId when supplied', () => {
    const result = factory.fromManualCreation({
      storeId: 'store-1',
      buyerId: 'buyer-1',
      inquiryId: 'inquiry-1',
      items: [basicLine],
      feeRateBasisPoints: 500,
    });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().inquiryId).toBe('inquiry-1');
  });

  it('leaves inquiryId null when not supplied', () => {
    const result = factory.fromManualCreation({
      storeId: 'store-1',
      buyerId: 'buyer-1',
      items: [basicLine],
      feeRateBasisPoints: 500,
    });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().inquiryId).toBeNull();
  });
});
