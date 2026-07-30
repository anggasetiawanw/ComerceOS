'use client';

import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ApiError } from '@/lib/api/client';
import { uploadFile } from '@/lib/api/upload';

interface FileUploaderProps<T> {
  label: string;
  endpoint: string;
  maxBytes: number;
  onUploaded: (result: T) => void;
}

export const FileUploader = <T,>({ label, endpoint, maxBytes, onUploaded }: FileUploaderProps<T>) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setNotConfigured(false);

    if (file.size > maxBytes) {
      setError(`Ukuran maksimal ${Math.round(maxBytes / 1024 / 1024)}MB`);
      return;
    }

    setProgress(0);
    try {
      const result = await uploadFile<T>(endpoint, file, setProgress);
      onUploaded(result);
    } catch (uploadError) {
      if (uploadError instanceof ApiError && uploadError.problem.type === 'STORAGE.NOT_CONFIGURED') {
        setNotConfigured(true);
      } else if (uploadError instanceof ApiError) {
        setError(uploadError.problem.detail);
      } else {
        setError('Gagal mengunggah, coba lagi.');
      }
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileUp className="size-4" />
          <span>Berkas privat, hanya bisa diunduh pembeli setelah membayar.</span>
        </div>
        {progress !== null && <Progress value={progress} />}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => inputRef.current?.click()}
        >
          Pilih file
        </Button>
      </div>
      {notConfigured && (
        <Alert variant="destructive">
          <AlertDescription>
            Penyimpanan berkas belum dikonfigurasi di server ini. Fitur unggah belum bisa dipakai.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
