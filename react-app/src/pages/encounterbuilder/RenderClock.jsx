import { useEffect, useLayoutEffect } from 'react';

// TEMPORARY diagnostic (to be removed): set window.__renderClock = [] in the
// console, act, then read it. Each mark is [name, time] when React reaches it.
export function markRender(at) {
  const clock = typeof window !== 'undefined' ? window.__renderClock : null;
  if (clock) clock.push([at, performance.now()]);
}

export function Mark({ at }) {
  markRender(at);
  return null;
}

export function useCommitMarks(at) {
  useLayoutEffect(() => { markRender(`${at}:layout`); });
  useEffect(() => { markRender(`${at}:passive`); });
}
