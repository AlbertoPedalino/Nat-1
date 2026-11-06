import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useDebouncedCallback } from '../../../../src/shared/ui/useDebouncedCallback.js';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

test('only the last call runs, once the calls stop', () => {
  const callback = vi.fn();
  const { result } = renderHook(() => useDebouncedCallback(callback, 200));
  act(() => { result.current('a'); result.current('b'); });
  act(() => { vi.advanceTimersByTime(199); });
  expect(callback).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1); });
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith('b');
});

test('a pending call is dropped when the component unmounts', () => {
  const callback = vi.fn();
  const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 200));
  act(() => { result.current('x'); });
  unmount();
  act(() => { vi.advanceTimersByTime(500); });
  expect(callback).not.toHaveBeenCalled();
});
