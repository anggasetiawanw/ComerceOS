import { Badge } from '@/components/ui/badge';

type ProductTypeValue = 'digital' | 'physical' | 'service';

const LABEL_BY_TYPE: Record<ProductTypeValue, string> = {
  digital: 'Digital',
  physical: 'Fisik',
  service: 'Jasa',
};

export const ProductTypeBadge = ({ productType }: { productType: ProductTypeValue }) => (
  <Badge variant="outline">{LABEL_BY_TYPE[productType]}</Badge>
);
