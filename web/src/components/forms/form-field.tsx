import type { FieldError } from 'react-hook-form';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: FieldError;
  children: ReactNode;
}

export const FormField = ({ label, htmlFor, error, children }: FormFieldProps) => {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
};
