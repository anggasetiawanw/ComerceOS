'use client';

import { FileText } from 'lucide-react';
import { DataTable } from '@/components/data/data-table';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { useInvoices } from '../hooks/use-invoices';
import { invoiceColumns } from './invoice-columns';
import { InvoiceRowCard } from './invoice-row-card';

export const InvoiceTable = () => {
  const { cursor, canGoPrev, goNext, goPrev } = useCursorPagination();
  const { data, isPending, isError, refetch } = useInvoices({ cursor });

  return (
    <DataTable
      columns={invoiceColumns}
      data={data?.items ?? []}
      isPending={isPending}
      isError={isError}
      onRetry={() => void refetch()}
      empty={{
        icon: FileText,
        title: 'Belum ada invoice',
        description: 'Invoice dibuat otomatis setiap ada pesanan yang dibayar.',
      }}
      pagination={{
        hasMore: data?.meta.hasMore ?? false,
        canGoPrev,
        onNext: () => goNext(data?.meta.nextCursor ?? null),
        onPrev: goPrev,
      }}
      renderCard={(invoice) => <InvoiceRowCard invoice={invoice} />}
      getRowId={(invoice) => invoice.id}
    />
  );
};
