import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { CacheService } from '../../../../shared/infrastructure/cache/cache.service';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../catalog/domain/repositories/product.repository';
import { STORE_REPOSITORY, StoreRepository } from '../../../store/domain/repositories/store.repository';
import { Phone } from '../../../../shared/kernel/value-objects/phone.vo';
import { Inquiry } from '../../domain/entities/inquiry.aggregate';
import { INQUIRY_REPOSITORY, InquiryRepository } from '../../domain/repositories/inquiry.repository';
import { ProductNotFoundForStoreError, StoreNotFoundForOrderError } from '../../domain/errors/ordering.errors';

export interface CreateInquiryResult {
  inquiryId: string;
  waLink: string | null;
}

type CreateInquiryError = StoreNotFoundForOrderError | ProductNotFoundForStoreError;

const isCreateInquiryResult = (value: unknown): value is CreateInquiryResult => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.inquiryId === 'string' && (record.waLink === null || typeof record.waLink === 'string');
};

const DEDUP_TTL_SECONDS = 5 * 60;

// The public, unauthenticated entry point into Path B — a storefront
// visitor clicks "Tanya dulu via WA". No buyer contact fields are recorded
// (.docs/brief/database-schema.md) beyond an optional buyerId when the
// visitor happens to be logged in; the seller matches an anonymous inquiry
// to their own WA inbox by product and timing. Deduplicated in Redis so a
// double click or a bored visitor cannot flood the seller's inquiry list.
@Injectable()
export class CreateInquiryService {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
    private readonly cache: CacheService,
    private readonly config: AppConfigService,
  ) {}

  async execute(params: {
    username: string;
    productId: string | null;
    buyerId: string | null;
    dedupToken: string;
  }): Promise<Result<CreateInquiryResult, CreateInquiryError>> {
    const store = await this.stores.findByUsername(params.username);
    if (!store) return Result.err(new StoreNotFoundForOrderError());

    const productName = params.productId ? await this.resolveProductName(store.id, params.productId) : null;
    if (params.productId && productName === null) {
      return Result.err(new ProductNotFoundForStoreError(params.productId));
    }

    const dedupKey = `inquiry-dedup:${store.id}:${params.productId ?? 'none'}:${params.dedupToken}`;
    const cached = await this.cache.get(dedupKey, isCreateInquiryResult);
    if (cached) return Result.ok(cached);

    const inquiry = Inquiry.create({ storeId: store.id, productId: params.productId, buyerId: params.buyerId });

    await this.transactionManager.runInTransaction(async () => {
      await this.inquiries.save(inquiry);
      await this.outbox.enqueueAll(inquiry.pullDomainEvents());
    });

    const waLink = this.buildWaLink(store, productName);
    const result: CreateInquiryResult = { inquiryId: inquiry.id, waLink };

    await this.cache.set(dedupKey, result, DEDUP_TTL_SECONDS);
    return Result.ok(result);
  }

  private async resolveProductName(storeId: string, productId: string): Promise<string | null> {
    const product = await this.products.findByIdForStore(storeId, productId);
    return product ? product.name : null;
  }

  private buildWaLink(store: { profile: { displayName: string }; whatsappNumber: Phone | null }, productName: string | null): string | null {
    if (!store.whatsappNumber) return null;

    const message = productName
      ? `Halo ${store.profile.displayName}, saya mau tanya tentang produk "${productName}".`
      : `Halo ${store.profile.displayName}, saya mau tanya-tanya.`;

    return store.whatsappNumber.toWhatsAppLink(message);
  }
}
