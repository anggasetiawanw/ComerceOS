'use client';

import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { OnboardingStatus } from '../types/dashboard.types';

interface OnboardingStep {
  key: keyof OnboardingStatus;
  label: string;
  href?: string;
  cta?: string;
}

const STEPS: OnboardingStep[] = [
  { key: 'hasProfile', label: 'Lengkapi profil toko', href: '/dashboard/toko', cta: 'Lengkapi' },
  { key: 'hasPublishedProduct', label: 'Publikasikan produk pertama', href: '/dashboard/produk/baru', cta: 'Tambah' },
  { key: 'hasBankAccount', label: 'Tambah rekening bank', href: '/dashboard/keuangan/rekening', cta: 'Tambah' },
  { key: 'hasFirstSale', label: 'Penjualan pertama' },
];

export const OnboardingChecklist = ({ onboarding }: { onboarding: OnboardingStatus }) => {
  const doneCount = STEPS.filter((step) => onboarding[step.key]).length;

  if (doneCount === STEPS.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Mulai jualan</span>
          <span className="text-sm font-normal text-muted-foreground">
            {doneCount}/{STEPS.length} selesai
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress value={(doneCount / STEPS.length) * 100}>
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>

        <ul className="flex flex-col gap-2">
          {STEPS.map((step) => {
            const done = onboarding[step.key];
            return (
              <li
                key={step.key}
                className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={done ? 'text-sm text-muted-foreground line-through' : 'text-sm font-medium'}>
                    {step.label}
                  </span>
                </div>
                {!done && step.href && step.cta && (
                  <Button variant="outline" size="sm" className="self-end sm:self-auto" render={<Link href={step.href} />}>
                    {step.cta}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};
