import { InvoiceViewModel } from './invoice-view-model';
import { formatRupiah, formatWibDate } from './format';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderItemRow = (item: InvoiceViewModel['items'][number]): string => `
  <tr>
    <td>${escapeHtml(item.name)}</td>
    <td class="num">${item.qty}</td>
    <td class="num">${formatRupiah(item.priceRupiah)}</td>
    <td class="num">${formatRupiah(item.subtotalRupiah)}</td>
  </tr>`;

export const renderInvoiceHtml = (vm: InvoiceViewModel): string => `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(vm.invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #18181b; margin: 0; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .header h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #71717a; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 24px; }
  .parties .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #e4e4e7; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
  .num { text-align: right; }
  .totals { margin-left: auto; width: 260px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { font-weight: 700; font-size: 15px; border-top: 1px solid #18181b; margin-top: 6px; padding-top: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Invoice</h1>
      <div class="muted">${escapeHtml(vm.invoiceNumber)}</div>
    </div>
    <div class="muted">
      <div>${escapeHtml(vm.store.displayName)}</div>
      <div>@${escapeHtml(vm.store.username)}</div>
      <div>${formatWibDate(vm.issuedAtIso)}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="label">Ditagihkan kepada</div>
      <div>${escapeHtml(vm.buyer.name)}</div>
      <div class="muted">${escapeHtml(vm.buyer.email)}</div>
    </div>
    <div>
      <div class="label">Pesanan</div>
      <div>${escapeHtml(vm.order.orderNumber)}</div>
      <div class="muted">${vm.order.paidAtIso ? formatWibDate(vm.order.paidAtIso) : '-'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Produk</th><th class="num">Qty</th><th class="num">Harga</th><th class="num">Subtotal</th></tr>
    </thead>
    <tbody>
      ${vm.items.map(renderItemRow).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${formatRupiah(vm.subtotalRupiah)}</span></div>
    <div><span>Diskon</span><span>-${formatRupiah(vm.discountRupiah)}</span></div>
    <div class="grand"><span>Total</span><span>${formatRupiah(vm.totalRupiah)}</span></div>
  </div>
</body>
</html>`;
