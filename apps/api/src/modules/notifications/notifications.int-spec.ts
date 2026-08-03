import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RedisModule } from '../../shared/infrastructure/redis/redis.module';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.constants';
import { EventsModule } from '../../shared/infrastructure/events/events.module';
import { StorageModule } from '../../shared/infrastructure/storage/storage.module';
import { QueueModule } from '../../shared/infrastructure/queue/queue.module';
import { NOTIFICATION_CHANNELS, DeliveryResult, NotificationChannel, Recipient, RenderedMessage } from './application/ports/notification-channel.port';
import { NotificationDispatcher } from './application/services/notification-dispatcher.service';
import { SendEmailService } from './application/services/send-email.service';
import { NOTIFICATION_TEMPLATES } from './domain/value-objects/notification-templates';
import { EmailChannel } from './infrastructure/channels/email.channel';
import { NotificationsModule } from './notifications.module';

class FakeChannel implements NotificationChannel {
  readonly type = 'email' as const;
  readonly provider = 'fake';
  shouldFail = false;

  supports(_recipient: Recipient): boolean {
    return true;
  }

  async send(_recipient: Recipient, _message: RenderedMessage): Promise<DeliveryResult> {
    if (this.shouldFail) {
      return { provider: this.provider, success: false, error: 'simulated provider failure' };
    }
    return { provider: this.provider, success: true };
  }
}

describe('Notifications (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let dispatcher: NotificationDispatcher;
  let sendEmail: SendEmailService;
  const fakeChannel = new FakeChannel();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule, RedisModule, EventsModule, StorageModule, QueueModule, NotificationsModule],
    })
      .overrideProvider(NOTIFICATION_CHANNELS)
      .useValue([fakeChannel])
      // NotificationDispatcher selects a channel via NOTIFICATION_CHANNELS,
      // but SendEmailService (and its processor) always inject the concrete
      // EmailChannel directly — the only channel a send-email job ever
      // uses. Both must be overridden for the fake to control both halves
      // of the flow (dispatch's channel selection and the actual send).
      .overrideProvider(EmailChannel)
      .useValue(fakeChannel)
      .compile();

    prisma = moduleRef.get(PrismaService);
    dispatcher = moduleRef.get(NotificationDispatcher);
    sendEmail = moduleRef.get(SendEmailService);
  });

  beforeEach(async () => {
    fakeChannel.shouldFail = false;
    await prisma.notificationDelivery.deleteMany();

    const redis = moduleRef.get(REDIS_CLIENT);
    await redis.flushdb();
  });

  afterAll(async () => {
    const redis = moduleRef.get(REDIS_CLIENT);
    await redis.quit();
    await moduleRef.close();
  });

  const dispatchOrderReleased = async (email: string) =>
    dispatcher.dispatch({
      template: NOTIFICATION_TEMPLATES.ORDER_RELEASED,
      recipient: { email, phone: null },
      payload: { sellerName: 'Seller', storeName: 'Toko Notif', orderNumber: 'ORD-TEST-1', amountRupiah: '95000' },
    });

  it('dispatch writes a pending row before anything is sent', async () => {
    await dispatchOrderReleased('notif-recipient-1@example.com');

    const row = await prisma.notificationDelivery.findFirst({ where: { recipient: 'notif-recipient-1@example.com' } });
    expect(row).not.toBeNull();
    expect(row?.status).toBe('pending');
    expect(row?.template).toBe('order_released');
  });

  it('a successful channel marks the delivery sent', async () => {
    await dispatchOrderReleased('notif-recipient-2@example.com');
    const row = await prisma.notificationDelivery.findFirstOrThrow({
      where: { recipient: 'notif-recipient-2@example.com' },
    });

    await sendEmail.send(row.id);

    const updated = await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: row.id } });
    expect(updated.status).toBe('sent');
    expect(updated.sentAt).not.toBeNull();
  });

  it('a failing channel marks the delivery failed with attempts incremented', async () => {
    fakeChannel.shouldFail = true;
    await dispatchOrderReleased('notif-recipient-3@example.com');
    const row = await prisma.notificationDelivery.findFirstOrThrow({
      where: { recipient: 'notif-recipient-3@example.com' },
    });

    await expect(sendEmail.send(row.id)).rejects.toThrow();

    const updated = await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: row.id } });
    expect(updated.status).toBe('failed');
    expect(updated.attempts).toBe(1);
    expect(updated.errorMessage).toBe('simulated provider failure');
  });
});
