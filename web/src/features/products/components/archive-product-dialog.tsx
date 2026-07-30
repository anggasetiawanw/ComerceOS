'use client';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useArchiveProduct } from '../hooks/use-archive-product';

interface ArchiveProductDialogProps {
  productId: string;
  productName: string;
}

export const ArchiveProductDialog = ({ productId, productName }: ArchiveProductDialogProps) => {
  const archive = useArchiveProduct();

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          Arsipkan
        </Button>
      }
      title="Arsipkan produk?"
      description={`"${productName}" tidak akan tampil lagi di toko publik. Produk tidak dihapus dan bisa diaktifkan kembali kapan saja.`}
      confirmLabel="Arsipkan"
      destructive
      onConfirm={async () => {
        await archive.mutateAsync(productId);
      }}
    />
  );
};
