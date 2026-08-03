import { DigitalDelivery } from './digital-delivery.aggregate';

const provisionDelivery = (maxDownloads = 3) =>
  DigitalDelivery.provision({
    orderItemId: 'order-item-1',
    filePath: 'stores/1/products/1/files/ebook.pdf',
    maxDownloads,
    expiresAt: new Date('2026-08-03T00:00:00.000Z'),
  }).unwrap();

describe('DigitalDelivery aggregate', () => {
  it('provisions with a zero download count and emits DeliveryProvisioned', () => {
    const delivery = provisionDelivery();

    expect(delivery.allowance.count).toBe(0);
    expect(delivery.allowance.max).toBe(3);
    const events = delivery.pullDomainEvents();
    expect(events.map((event) => event.eventName)).toEqual(['delivery.provisioned']);
  });

  it('recordDownload increments the counter before the caller ever gets a URL', () => {
    const delivery = provisionDelivery();
    delivery.pullDomainEvents();

    const result = delivery.recordDownload();

    expect(result.isOk()).toBe(true);
    expect(delivery.allowance.count).toBe(1);
    expect(delivery.pullDomainEvents().map((event) => event.eventName)).toEqual(['delivery.file_downloaded']);
  });

  it('rejects a download once the limit is reached and emits DownloadLimitReached', () => {
    const delivery = provisionDelivery(1);
    delivery.recordDownload();
    delivery.pullDomainEvents();

    const result = delivery.recordDownload();

    expect(result.isErr()).toBe(true);
    expect(delivery.allowance.count).toBe(1);
    expect(delivery.pullDomainEvents().map((event) => event.eventName)).toEqual(['delivery.download_limit_reached']);
  });
});
