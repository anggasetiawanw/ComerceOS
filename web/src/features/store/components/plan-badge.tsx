import { Badge } from '@/components/ui/badge';

interface PlanBadgeProps {
  plan: string;
}

export const PlanBadge = ({ plan }: PlanBadgeProps) => {
  if (plan !== 'pro') return null;
  return <Badge variant="default">Pro</Badge>;
};
