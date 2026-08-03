'use client';

import { useCallback, useState } from 'react';

export interface CursorPaginationState {
  cursor: string | undefined;
  canGoPrev: boolean;
  goNext: (nextCursor: string | null) => void;
  goPrev: () => void;
  reset: () => void;
}

// A stack of cursors used to reach the current page, rather than URL sync —
// simpler than .docs/11's full URL-synced filter contract, and a
// deliberate scope reduction recorded as drift for this sprint. Search/sort
// changes call reset() so a filter change always restarts from page one.
export const useCursorPagination = (): CursorPaginationState => {
  const [stack, setStack] = useState<string[]>([]);

  const goNext = useCallback((nextCursor: string | null) => {
    if (!nextCursor) return;
    setStack((prev) => [...prev, nextCursor]);
  }, []);

  const goPrev = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const reset = useCallback(() => setStack([]), []);

  return {
    cursor: stack[stack.length - 1],
    canGoPrev: stack.length > 0,
    goNext,
    goPrev,
    reset,
  };
};
