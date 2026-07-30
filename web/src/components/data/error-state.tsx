import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => {
  return (
    <Alert variant="destructive" className="flex flex-col gap-2">
      <AlertDescription>{message ?? 'Terjadi kesalahan, coba lagi.'}</AlertDescription>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="self-start">
          Coba lagi
        </Button>
      )}
    </Alert>
  );
};
