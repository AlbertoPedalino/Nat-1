import { useLayoutEffect, useState } from 'react';

const itself = (element) => element;

// What an element sits in: the box a drawing over it is measured by.
export const parentOf = (element) => element.parentElement;

// Two measures the same, field by field (a read's places included).
const same = (was, now) => was !== null && JSON.stringify(was) === JSON.stringify(now);

// An element's size, { width, height } in whole px (null until measured):
// measured as it is laid out and again whenever it is resized. `ref` holds an
// element; `pick` finds the one measured from it (itself unless said, a
// module-level function: a new one each render would measure again).
// `read`, where given (module-level too), reads what is laid out in it at
// the same moment (where a toast's dice and total stand, where a row's tiles
// are), answered as `read` beside the size. The one place a drawing reads the
// page's layout: after it is laid out, never while it is being drawn, where
// each read made the browser lay the whole page out again halfway (a natural
// 1's toast, read so twice, stalled a frame for half a second).
export function useElementSize(ref, pick = itself, read = null) {
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const element = ref.current && pick(ref.current);
    if (!element) return undefined;
    const measure = () => {
      const now = { width: Math.round(element.clientWidth), height: Math.round(element.clientHeight), ...(read ? { read: read(element) } : null) };
      setSize((was) => (same(was, now) ? was : now));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, pick, read]);
  return size;
}
