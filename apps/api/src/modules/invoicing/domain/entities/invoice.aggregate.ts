import { InvoiceViewModel } from '@nagihin/contracts';
import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { InvoiceNumber } from '../value-objects/invoice-number.vo';
import { InvoiceGeneratedEvent } from '../events/invoice-generated.event';

export type InvoiceSentViaValue = 'wa' | 'email' | 'both';

export interface InvoiceProps {
  orderId: string;
  storeId: string;
  invoiceNumber: InvoiceNumber;
  pdfUrl: string | null;
  renderedAt: Date | null;
  sentVia: InvoiceSentViaValue | null;
  sentAt: Date | null;
  snapshot: InvoiceViewModel;
  createdAt: Date;
}

export class Invoice extends AggregateRoot<InvoiceProps> {
  private constructor(props: InvoiceProps, id?: UniqueId) {
    super(props, id);
  }

  // Snapshots everything into `snapshot` so a later product rename or
  // store profile edit never alters an issued invoice
  // (.docs/04-entity-design.md §7).
  static fromOrder(params: {
    orderId: string;
    storeId: string;
    invoiceNumber: InvoiceNumber;
    snapshot: InvoiceViewModel;
  }): Invoice {
    const invoice = new Invoice({
      orderId: params.orderId,
      storeId: params.storeId,
      invoiceNumber: params.invoiceNumber,
      pdfUrl: null,
      renderedAt: null,
      sentVia: null,
      sentAt: null,
      // Defensively cloned so a caller mutating its own view-model object
      // after construction can never leak into what gets persisted.
      snapshot: structuredClone(params.snapshot),
      createdAt: new Date(),
    });
    invoice.addDomainEvent(new InvoiceGeneratedEvent(invoice.id, params.orderId, params.storeId));
    return invoice;
  }

  static reconstitute(props: InvoiceProps, id: UniqueId): Invoice {
    return new Invoice(props, id);
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get invoiceNumber(): InvoiceNumber {
    return this.props.invoiceNumber;
  }

  // Despite the name (kept to match the `pdf_url` column from the
  // documented schema), this holds a storage PATH, not a resolvable URL —
  // same precedent as digital_deliveries: a signed URL is generated fresh
  // on each request rather than persisted, so it can never be served after
  // expiry (.docs/06-database-roadmap.md §2.7).
  get pdfUrl(): string | null {
    return this.props.pdfUrl;
  }

  get renderedAt(): Date | null {
    return this.props.renderedAt;
  }

  get sentVia(): InvoiceSentViaValue | null {
    return this.props.sentVia;
  }

  get sentAt(): Date | null {
    return this.props.sentAt;
  }

  get snapshot(): InvoiceViewModel {
    return this.props.snapshot;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isRendered(): boolean {
    return this.props.renderedAt !== null;
  }

  markRendered(pdfUrl: string): void {
    this.props.pdfUrl = pdfUrl;
    this.props.renderedAt = new Date();
  }

  markSent(via: InvoiceSentViaValue): void {
    this.props.sentVia = via;
    this.props.sentAt = new Date();
  }
}
