'use client';

import { InvoiceTable } from '@/features/invoices/components/invoice-table';

const InvoicesPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Invoice</h1>
        <p className="text-sm text-muted-foreground">Semua invoice yang dibuat otomatis untuk pesanan yang dibayar.</p>
      </div>
      <InvoiceTable />
    </div>
  );
};

export default InvoicesPage;
