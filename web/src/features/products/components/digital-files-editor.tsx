'use client';

import { Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/data/error-state';
import { EmptyState } from '@/components/data/empty-state';
import { FileUploader } from '@/components/forms/file-uploader';
import { productKeys } from '../api/product.keys';
import { useDigitalFiles, useRemoveDigitalFile } from '../hooks/use-digital-files';
import type { DigitalFile } from '../types/product.types';

const MAX_DIGITAL_FILE_BYTES = 50 * 1024 * 1024;
const MAX_DIGITAL_FILES = 5;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DigitalFilesEditor = ({ productId }: { productId: string }) => {
  const queryClient = useQueryClient();
  const { data: files, isPending, isError, refetch } = useDigitalFiles(productId);
  const remove = useRemoveDigitalFile(productId);

  return (
    <div className="flex flex-col gap-4">
      {isPending && <Skeleton className="h-10 w-full" />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {files && files.length === 0 && (
        <EmptyState
          title="Belum ada berkas digital"
          description="Produk digital butuh minimal satu berkas sebelum bisa diterbitkan."
        />
      )}

      {files && files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="flex-1 truncate">{file.fileName}</span>
              <span className="text-muted-foreground">{formatFileSize(file.sizeBytes)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Hapus berkas"
                disabled={remove.isPending && remove.variables === file.id}
                onClick={() => remove.mutate(file.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {(files?.length ?? 0) < MAX_DIGITAL_FILES && (
        <FileUploader<DigitalFile>
          label="Unggah berkas"
          endpoint={`/products/${productId}/files`}
          maxBytes={MAX_DIGITAL_FILE_BYTES}
          onUploaded={() => {
            void queryClient.invalidateQueries({ queryKey: productKeys.files(productId) });
            void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
          }}
        />
      )}
    </div>
  );
};
