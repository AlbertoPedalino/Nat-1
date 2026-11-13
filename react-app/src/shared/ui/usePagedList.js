import { useCallback, useLayoutEffect, useRef, useState } from 'react';

// Incremental rendering for long item lists: show a page, grow on scroll. A
// list too short to fill its scroller (a tall panel, a page made taller)
// grows by itself until it does, so every row is reachable by scrolling and
// no "Show more" button is needed: the scroller is the way to more. Every
// list paged here lives in a scroller and spreads `listProps` on it.
//
// A hard cap was the alternative and it lied — against a DB of ~2500
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

  // Near the bottom of the scroller (or with nothing to scroll yet): one page
  // more, once per commit. A scroller with no height is hidden (a list put
  // away behind an entry on a phone): it waits until it is shown.
  const growIfNearBottom = useCallback((el) => {
    if (!el || !el.clientHeight || growPendingRef.current) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > NEAR_BOTTOM_PX) return;
    growPendingRef.current = true;
    setLimit((prev) => prev + pageSize);
  }, [pageSize]);

  const onScroll = useCallback((event) => growIfNearBottom(event.currentTarget), [growIfNearBottom]);

  const visible = list.slice(0, limit);
  const remaining = list.length - visible.length;

  // A scroller the rows do not fill yet, now or after it grows (a panel
  // stretched by its row, a window made taller), takes the next page; the
  // page asked for before is committed, so the latch opens again first.
  useLayoutEffect(() => {
    growPendingRef.current = false;
    const el = scrollRef.current;
    if (!el || remaining <= 0) return undefined;
    growIfNearBottom(el);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => growIfNearBottom(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, [remaining, limit, growIfNearBottom]);

  return {
    visible,
    remaining,
    listProps: { ref: scrollRef, onScroll: remaining > 0 ? onScroll : undefined },
  };
}
