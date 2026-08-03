'use client';

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';

export interface DataTableEmptyProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface DataTablePagination {
  hasMore: boolean;
  canGoPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  empty: DataTableEmptyProps;
  pagination: DataTablePagination;
  renderCard: (row: TData) => ReactNode;
  getRowId: (row: TData) => string;
}

// Server-side sorting and pagination only — this never fetches everything
// and filters client-side. Loading/empty/error are required, not optional,
// so no list built on this can ship without all three
// (.docs/11-frontend.md). The responsive card fallback is CSS
// (hidden md:block / md:hidden), not a JS breakpoint check, so there is no
// hydration mismatch between server and client render.
export const DataTable = <TData,>({
  columns,
  data,
  isPending,
  isError,
  onRetry,
  empty,
  pagination,
  renderCard,
  getRowId,
}: DataTableProps<TData>) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (data.length === 0) {
    return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {data.map((row) => (
          <div key={getRowId(row)}>{renderCard(row)}</div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={!pagination.canGoPrev} onClick={pagination.onPrev}>
          Sebelumnya
        </Button>
        <Button variant="outline" size="sm" disabled={!pagination.hasMore} onClick={pagination.onNext}>
          Selanjutnya
        </Button>
      </div>
    </div>
  );
};
