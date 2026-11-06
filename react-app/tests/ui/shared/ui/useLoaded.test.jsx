import { renderHook, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useLoaded } from '../../../../src/shared/ui/useLoaded.js';

test('a loader result becomes ready data', async () => {
  const { result } = renderHook(() => useLoaded(async () => ['a'], [], { initial: [] }));
  expect(result.current).toMatchObject({ data: [], status: 'loading' });
  await waitFor(() => expect(result.current).toMatchObject({ data: ['a'], status: 'ready' }));
});

test('a failed load keeps the data it had and reports the error', async () => {
  const failure = new Error('offline');
  const { result } = renderHook(() => useLoaded(async () => { throw failure; }, [], { initial: [] }));
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current.data).toEqual([]);
  expect(result.current.error).toBe(failure);
});
