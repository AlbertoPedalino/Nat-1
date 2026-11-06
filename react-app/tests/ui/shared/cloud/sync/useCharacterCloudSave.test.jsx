import { act, renderHook } from '@testing-library/react';
import { useCharacterCloudSave } from '../../../../../src/shared/cloud/sync/useCharacterCloudSave.js';
import { SHEET_CONFLICT } from '../../../../../src/shared/cloud/api/cloudCharacters.js';

const online = () => act(async () => { window.dispatchEvent(new Event('online')); await Promise.resolve(); });

test('a failed save is reported once and retried when the network comes back', async () => {
  const save = vi.fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ sheetRevision: 3 });
  const onError = vi.fn();
  const { result } = renderHook(() => useCharacterCloudSave({ save, onError }));

  await act(async () => { expect(await result.current.request()).toBeNull(); });
  await online();
  expect(save).toHaveBeenCalledTimes(2);
  expect(onError).toHaveBeenCalledOnce();

  await online();
  expect(save).toHaveBeenCalledTimes(3);
  await online();
  expect(save).toHaveBeenCalledTimes(3);
});

test('a conflict goes to the user and is not retried', async () => {
  const conflict = Object.assign(new Error('moved on'), { code: SHEET_CONFLICT });
  const save = vi.fn().mockRejectedValue(conflict);
  const onConflict = vi.fn();
  const onError = vi.fn();
  const { result } = renderHook(() => useCharacterCloudSave({ save, onConflict, onError }));

  await act(async () => { await result.current.request(); });
  await online();
  expect(onConflict).toHaveBeenCalledWith(conflict);
  expect(onError).not.toHaveBeenCalled();
  expect(save).toHaveBeenCalledOnce();
});

test('a pending change is retried on the triggers even without a failure; nothing runs while disabled', async () => {
  let pending = true;
  const save = vi.fn(async () => { pending = false; return {}; });
  const { rerender } = renderHook(({ enabled }) => useCharacterCloudSave({
    save, enabled, hasPending: () => pending,
  }), { initialProps: { enabled: false } });

  await online();
  expect(save).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await online();
  expect(save).toHaveBeenCalledOnce();
  await online();
  expect(save).toHaveBeenCalledOnce();
});
