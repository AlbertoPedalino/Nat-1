import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Incremental rendering for long item lists: show a page, grow on scroll or on
// demand. A hard cap was the alternative and it lied — against a DB of ~2500
// items, a filter that matched two thousand of them looked identical to no
// filter at all, because both showed the same first 120 alphabetical rows.
//
// `resetKey` — not the array identity — decides when to go back to page one.
// The inventory array is rebuilt on every quantity tick; resetting on that would
// yank the list back to the top mid-edit. Pass whatever describes the *query*
// (search text, chips, filters) and edits will leave the position alone.

const NEAR_BOTTOM_PX = 160;

export function usePagedList(items, { pageSize, resetKey }) {
  const list = Array.isArray(items) ? items : [];
  const [limit, setLimit] = useState(pageSize);
  const [appliedKey, setAppliedKey] = useState(resetKey);
  const scrollRef = useRef(null);
  // Scroll fires far faster than React commits, so without this latch a single
  // flick to the bottom would queue several pages at once.
  const growPendingRef = useRef(false);

  // Adjusting state during render (rather than in an effect) keeps a query
  // change to one commit: React re-runs this hook before anything paints.
  if (appliedKey !== resetKey) {
    setAppliedKey(resetKey);
    setLimit(pageSize);
  }

  useLayoutEffect(() => {
    growPendingRef.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [resetKey]);

  useEffect(() => {
    growPendingRef.current = false;
  }, [limit]);

  const grow = useCallback(() => setLimit((prev) => prev + pageSize), [pageSize]);

  const onScroll = useCallback((event) => {
    if (growPendingRef.current) return;
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > NEAR_BOTTOM_PX) return;
    growPendingRef.current = true;
    setLimit((prev) => prev + pageSize);
  }, [pageSize]);

  const visible = list.slice(0, limit);
  const remaining = list.length - visible.length;

  return {
    visible,
    remaining,
    showMore: grow,
    listProps: { ref: scrollRef, onScroll: remaining > 0 ? onScroll : undefined },
  };
}
