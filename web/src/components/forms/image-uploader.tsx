'use client';

import { useRef, useState, type DragEvent } from 'react';
import { ImageUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/client';
import { uploadFile } from '@/lib/api/upload';
import type { Store } from '@/features/store/types/store.types';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageUploaderProps {
  label: string;
  endpoint: string;
  maxBytes: number;
  currentUrl: string | null;
  aspectClassName: string;
  onUploaded: (store: Store) => void;
}

export const ImageUploader = ({
  label,
  endpoint,
  maxBytes,
  currentUrl,
  aspectClassName,
  onUploaded,
}: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setNotConfigured(false);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format harus JPEG, PNG, atau WebP');
      return;
    }
    if (file.size > maxBytes) {
      setError(`Ukuran maksimal ${Math.round(maxBytes / 1024 / 1024)}MB`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setProgress(0);

    try {
      const store = await uploadFile<Store>(endpoint, file, setProgress);
      onUploaded(store);
    } catch (uploadError) {
      if (
        uploadError instanceof ApiError &&
        uploadError.problem.type === 'STORAGE.NOT_CONFIGURED'
      ) {
        setNotConfigured(true);
      } else if (uploadError instanceof ApiError) {
        setError(uploadError.problem.detail);
      } else {
        setError('Gagal mengunggah, coba lagi.');
      }
    } finally {
      setProgress(null);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const displayUrl = preview ?? currentUrl;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className={`relative flex cursor-pointer items-center justify-center overflow-hidden border border-dashed bg-muted/30 hover:bg-muted/50 ${aspectClassName}`}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt={label} className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 p-4 text-center text-muted-foreground">
            <ImageUp className="size-6" />
            <span className="text-xs">Seret file atau klik untuk unggah</span>
          </div>
        )}
        {progress !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />
      </div>
      {notConfigured && (
        <Alert variant="destructive">
          <AlertDescription>
            Penyimpanan gambar belum dikonfigurasi di server ini. Fitur unggah belum bisa dipakai.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        Pilih file
      </Button>
    </div>
  );
};
