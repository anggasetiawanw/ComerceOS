import { formatWibDate } from '@nagihin/contracts';
import { cn } from '@/lib/utils';

export interface TimelineEntry {
  id: string;
  label: string;
  actorLabel: string | null;
  reason: string | null;
  createdAt: string;
}

interface TimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

// A static, per-order status history rendered as a vertical list — not
// per-order-derived release-reason text (that stayed HoldingCountdown's
// static explanation, per Sprint 6's own drift note). Oldest first, since
// that's the order the transitions actually happened in.
export const Timeline = ({ entries, className }: TimelineProps) => (
  <ol className={cn('flex flex-col gap-4', className)}>
    {entries.map((entry, index) => (
      <li key={entry.id} className="relative flex gap-3 pl-1">
        <div className="flex flex-col items-center">
          <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
          {index < entries.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
        </div>
        <div className="flex flex-col gap-0.5 pb-4">
          <span className="text-sm font-medium">{entry.label}</span>
          <span className="text-xs text-muted-foreground">
            {formatWibDate(entry.createdAt)}
            {entry.actorLabel ? ` · ${entry.actorLabel}` : ''}
          </span>
          {entry.reason && <span className="text-xs text-muted-foreground">{entry.reason}</span>}
        </div>
      </li>
    ))}
  </ol>
);
