import { Badge } from '@/components/ui/badge';
import type { ProductStatus } from '../types/product.types';

const VARIANT_BY_STATUS: Record<ProductStatus, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  active: 'default',
  archived: 'outline',
};

const LABEL_BY_STATUS: Record<ProductStatus, string> = {
  draft: 'Draf',
  active: 'Aktif',
  archived: 'Diarsipkan',
};

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => (
  <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>
);
