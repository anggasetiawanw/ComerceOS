import { Inquiry } from './inquiry.aggregate';

describe('Inquiry', () => {
  const create = () => Inquiry.create({ storeId: 'store-1', productId: 'product-1', buyerId: null });

  it('starts open and emits InquiryCreatedEvent', () => {
    const inquiry = create();
    expect(inquiry.status.value).toBe('open');
    const events = inquiry.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe('ordering.inquiry_created');
  });

  it('converts once, setting convertedOrderId and emitting InquiryConvertedEvent', () => {
    const inquiry = create();
    inquiry.pullDomainEvents();

    const result = inquiry.convert('order-1');
    expect(result.isOk()).toBe(true);
    expect(inquiry.status.value).toBe('converted');
    expect(inquiry.convertedOrderId).toBe('order-1');
    expect(inquiry.pullDomainEvents()[0]?.eventName).toBe('ordering.inquiry_converted');
  });

  it('rejects a second conversion', () => {
    const inquiry = create();
    inquiry.convert('order-1');

    const result = inquiry.convert('order-2');
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().constructor.name).toBe('InquiryAlreadyConvertedError');
    expect(inquiry.convertedOrderId).toBe('order-1');
  });

  it('rejects converting a lost inquiry', () => {
    const inquiry = create();
    inquiry.markLost();

    const result = inquiry.convert('order-1');
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().constructor.name).toBe('InquiryAlreadyLostError');
  });

  it('marks lost once, emitting InquiryMarkedLostEvent', () => {
    const inquiry = create();
    inquiry.pullDomainEvents();

    const result = inquiry.markLost();
    expect(result.isOk()).toBe(true);
    expect(inquiry.status.value).toBe('lost');
    expect(inquiry.pullDomainEvents()[0]?.eventName).toBe('ordering.inquiry_marked_lost');
  });

  it('rejects marking a converted inquiry lost', () => {
    const inquiry = create();
    inquiry.convert('order-1');

    const result = inquiry.markLost();
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().constructor.name).toBe('InquiryAlreadyConvertedError');
  });

  it('rejects marking an already-lost inquiry lost again', () => {
    const inquiry = create();
    inquiry.markLost();

    const result = inquiry.markLost();
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().constructor.name).toBe('InquiryAlreadyLostError');
  });

  it('belongsToStore matches the creating store only', () => {
    const inquiry = create();
    expect(inquiry.belongsToStore('store-1')).toBe(true);
    expect(inquiry.belongsToStore('store-2')).toBe(false);
  });
});
