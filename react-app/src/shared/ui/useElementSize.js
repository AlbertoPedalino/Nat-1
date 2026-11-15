import { useLayoutEffect, useState } from 'react';

const itself = (element) => element;

// What an element sits in: the box a drawing over it is measured by.
export const parentOf = (element) => element.parentElement;

// An element's size, { width, height } in whole px (null until measured):
// measured as it is laid out and again whenever it is resized. `ref` holds an
// element; `pick` finds the one measured from it (itself unless said, a
// module-level function: a new one each render would measure again).
export function useElementSize(ref, pick = itself) {
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const element = ref.current && pick(ref.current);
    if (!element) return undefined;
    const measure = () => {
      const width = Math.round(element.clientWidth);
      const height = Math.round(element.clientHeight);
      setSize((was) => (was?.width === width && was?.height === height ? was : { width, height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, pick]);
  return size;
}
