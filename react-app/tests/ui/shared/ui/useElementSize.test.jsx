import { renderHook } from '@testing-library/react';
import { useElementSize } from '../../../../src/shared/ui/useElementSize.js';

// An element's size is read as it is laid out, of the element itself or of
// the one `pick` finds from it.
test('measures the element, or the one picked from it', () => {
  const parent = document.createElement('div');
  const child = document.createElement('div');
  parent.appendChild(child);
  Object.defineProperties(child, { clientWidth: { value: 120.4 }, clientHeight: { value: 30 } });
  Object.defineProperties(parent, { clientWidth: { value: 300 }, clientHeight: { value: 200 } });
  const ref = { current: child };
  expect(renderHook(() => useElementSize(ref)).result.current).toEqual({ width: 120, height: 30 });
  const parentOf = (element) => element.parentElement;
  expect(renderHook(() => useElementSize(ref, parentOf)).result.current).toEqual({ width: 300, height: 200 });
  expect(renderHook(() => useElementSize({ current: null })).result.current).toBeNull();
});
