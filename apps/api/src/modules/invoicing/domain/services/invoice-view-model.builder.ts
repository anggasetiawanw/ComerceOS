import { InvoiceViewModel } from '@nagihin/contracts';
import { Order } from '../../../ordering/domain/entities/order.aggregate';

// Order + Store + buyer -> the frozen view model that both the PDF and the
// web InvoicePreview render. Every field is copied out as a primitive
// (string/number), so nothing here holds a live reference back to a
// Product/Store/User entity — that is what makes the snapshot immune to a
// later product rename or store profile edit (.docs/04 §7).
export class InvoiceViewModelBuilder {
  build(params: {
    invoiceNumber: string;
    order: Order;
    store: { displayName: string; username: string };
    buyer: { name: string; email: string };
  }): InvoiceViewModel {
    return {
      invoiceNumber: params.invoiceNumber,
      issuedAtIso: new Date().toISOString(),
      store: { displayName: params.store.displayName, username: params.store.username },
      buyer: { name: params.buyer.name, email: params.buyer.email },
      order: {
        orderNumber: params.order.orderNumber.value,
        paidAtIso: params.order.paidAt ? params.order.paidAt.toISOString() : null,
      },
      items: params.order.items.map((item) => ({
        name: item.productNameSnapshot,
        qty: item.qty,
        priceRupiah: item.priceSnapshot.toString(),
        subtotalRupiah: item.priceSnapshot.multiply(item.qty).unwrap().toString(),
      })),
      subtotalRupiah: params.order.subtotal.toString(),
      discountRupiah: params.order.discount.amount.toString(),
      totalRupiah: params.order.total.toString(),
    };
  }
}
