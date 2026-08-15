'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/forms/form-field';
import { MoneyInput } from '@/components/forms/money-input';
import { PhoneInput } from '@/components/forms/phone-input';
import { ProductSelect } from '@/components/forms/product-select';
import { ApiError } from '@/lib/api/client';
import { useCreateManualOrder } from '../hooks/use-create-manual-order';
import { inquiryApi } from '@/features/inquiries/api/inquiry.api';

interface ManualOrderLine {
  productId: string;
  qty: number;
  priceOverride: string;
}

const emptyLine = (): ManualOrderLine => ({ productId: '', qty: 1, priceOverride: '' });

interface ManualOrderFormProps {
  inquiryId?: string;
}

// Also serves inquiry conversion: when inquiryId is present, submitting
// calls POST /inquiries/:id/convert instead of POST /orders/manual so the
// inquiry is marked converted in the same action
// (.docs/12-roadmap-sprints.md Sprint 9).
export const ManualOrderForm = ({ inquiryId }: ManualOrderFormProps) => {
  const router = useRouter();
  const createManualOrder = useCreateManualOrder();
  const [lines, setLines] = useState<ManualOrderLine[]>([emptyLine()]);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateLine = (index: number, patch: Partial<ManualOrderLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const items = lines
      .filter((line) => line.productId)
      .map((line) => ({
        productId: line.productId,
        qty: line.qty,
        priceOverride: line.priceOverride || undefined,
      }));

    if (items.length === 0) {
      setError('Pilih minimal satu produk.');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = inquiryId
        ? await inquiryApi.convert(inquiryId, { items, buyerEmail, buyerName, buyerPhone: buyerPhone || null })
        : await createManualOrder.mutateAsync({ items, buyerEmail, buyerName, buyerPhone: buyerPhone || null });
      router.push(`/dashboard/pesanan/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.problem.detail : 'Terjadi kesalahan, coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lines.map((line, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FormField label="Produk" htmlFor={`product-${index}`}>
                  <ProductSelect value={line.productId} onChange={(productId) => updateLine(index, { productId })} />
                </FormField>
              </div>
              <div className="w-full sm:w-24">
                <FormField label="Qty" htmlFor={`qty-${index}`}>
                  <Input
                    id={`qty-${index}`}
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={(event) => updateLine(index, { qty: Number(event.target.value) || 1 })}
                  />
                </FormField>
              </div>
              <div className="w-full sm:w-48">
                <FormField label="Harga (opsional)" htmlFor={`price-${index}`}>
                  <MoneyInput
                    id={`price-${index}`}
                    value={line.priceOverride}
                    onChange={(digits) => updateLine(index, { priceOverride: digits })}
                    placeholder="Harga produk"
                  />
                </FormField>
              </div>
              {lines.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
            <Plus className="size-4" />
            Tambah item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pembeli</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FormField label="Nama" htmlFor="buyerName">
            <Input id="buyerName" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} required />
          </FormField>
          <FormField label="Email" htmlFor="buyerEmail">
            <Input
              id="buyerEmail"
              type="email"
              value={buyerEmail}
              onChange={(event) => setBuyerEmail(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Nomor WhatsApp (opsional)" htmlFor="buyerPhone">
            <PhoneInput id="buyerPhone" value={buyerPhone} onChange={setBuyerPhone} />
          </FormField>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {inquiryId ? 'Buat pesanan dari pertanyaan' : 'Buat pesanan'}
      </Button>
    </form>
  );
};
