import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { AppConfigService } from '../../shared/config/app-config.service';
import { OutboxModule } from '../../shared/infrastructure/outbox/outbox.module';
import { StoreModule } from '../store/store.module';
import { IdentityModule } from '../identity/identity.module';
import { OrderingModule } from '../ordering/ordering.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { INVOICE_REPOSITORY } from './domain/repositories/invoice.repository';
import { INVOICE_READ_REPOSITORY } from './domain/repositories/invoice-read.repository';
import { INVOICE_NUMBER_ALLOCATOR } from './application/ports/invoice-number-allocator.port';
import { PDF_RENDERER, PdfRenderer } from './application/ports/pdf-renderer.port';
import { InvoicePrismaRepository } from './infrastructure/persistence/invoice.prisma.repository';
import { InvoiceReadPrismaRepository } from './infrastructure/persistence/invoice-read.prisma.repository';
import { InvoiceNumberPrismaAllocator } from './infrastructure/persistence/invoice-number.prisma.allocator';
import { PuppeteerPdfRenderer } from './infrastructure/pdf/puppeteer-pdf.renderer';
import { NullPdfRenderer } from './infrastructure/pdf/null-pdf.renderer';
import { InvoiceService } from './application/services/invoice.service';
import { InvoiceDeliveryService } from './application/services/invoice-delivery.service';
import { InvoiceReadService } from './application/services/invoice-read.service';
import { InvoicesController } from './presentation/http/invoices.controller';
import { BuyerInvoicesController } from './presentation/http/buyer-invoices.controller';

@Module({
  imports: [AppConfigModule, StoreModule, IdentityModule, OrderingModule, NotificationsModule, OutboxModule],
  controllers: [InvoicesController, BuyerInvoicesController],
  providers: [
    { provide: INVOICE_REPOSITORY, useClass: InvoicePrismaRepository },
    { provide: INVOICE_READ_REPOSITORY, useClass: InvoiceReadPrismaRepository },
    { provide: INVOICE_NUMBER_ALLOCATOR, useClass: InvoiceNumberPrismaAllocator },
    PuppeteerPdfRenderer,
    NullPdfRenderer,
    {
      // Blank PUPPETEER_EXECUTABLE_PATH selects the null adapter — same
      // "blank config = null adapter" pattern as StorageModule and the
      // Midtrans stub gateway, which is what keeps invoicing.int-spec.ts
      // and local dev free of a Chromium dependency.
      provide: PDF_RENDERER,
      useFactory: (config: AppConfigService, puppeteerRenderer: PuppeteerPdfRenderer, nullRenderer: NullPdfRenderer): PdfRenderer =>
        config.isPdfRendererConfigured ? puppeteerRenderer : nullRenderer,
      inject: [AppConfigService, PuppeteerPdfRenderer, NullPdfRenderer],
    },
    InvoiceService,
    InvoiceDeliveryService,
    InvoiceReadService,
  ],
  exports: [InvoiceService, InvoiceDeliveryService, InvoiceReadService],
})
export class InvoicingModule {}
