import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationDispatcher } from '../../../notifications/application/services/notification-dispatcher.service';
import { NOTIFICATION_TEMPLATES } from '../../../notifications/domain/value-objects/notification-templates';
import { STORE_REPOSITORY, StoreRepository } from '../../../store/domain/repositories/store.repository';
import { USER_REPOSITORY, UserRepository } from '../../../identity/domain/repositories/user.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../catalog/domain/repositories/product.repository';

export interface DispatchInquiryNotificationInput {
  inquiryId: string;
  storeId: string;
  productId: string | null;
}

// Lives in ordering (the owning context), mirroring
// WithdrawalNotificationService living in ledger — same "one job name, one
// service that knows how to render its own recipient" pattern.
@Injectable()
export class InquiryNotificationService {
  private readonly logger = new Logger(InquiryNotificationService.name);

  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async dispatch(input: DispatchInquiryNotificationInput): Promise<void> {
    const store = await this.stores.findById(input.storeId);
    if (!store) {
      this.logger.warn(`dispatch-inquiry-notification: store "${input.storeId}" not found`);
      return;
    }

    const owner = await this.users.findById(store.ownerId);
    if (!owner) {
      this.logger.warn(`dispatch-inquiry-notification: owner for store "${input.storeId}" not found`);
      return;
    }

    const product = input.productId ? await this.products.findById(input.productId) : null;

    await this.dispatcher.dispatch({
      template: NOTIFICATION_TEMPLATES.INQUIRY_RECEIVED,
      recipient: { email: owner.email.value, phone: null },
      payload: {
        storeName: store.profile.displayName,
        productName: product ? product.name : null,
        inquiryId: input.inquiryId,
      },
    });
  }
}
