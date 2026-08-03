import { Badge } from '@/components/ui/badge';
import type { WithdrawalStatus } from '../types/payouts.types';

const VARIANT_BY_STATUS: Record<WithdrawalStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  requested: 'secondary',
  approved: 'default',
  paid: 'default',
  rejected: 'destructive',
};

const LABEL_BY_STATUS: Record<WithdrawalStatus, string> = {
  requested: 'Diajukan',
  approved: 'Disetujui',
  paid: 'Selesai',
  rejected: 'Ditolak',
};

export const WithdrawalStatusBadge = ({ status }: { status: WithdrawalStatus }) => (
  <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>
);
