import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const m = vi.hoisted(() => ({ get: vi.fn(), channel: vi.fn() }));

vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: { channel: (...args) => m.channel(...args), removeChannel: vi.fn() },
}));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  getCloudCharacter: (...args) => m.get(...args),
}));

import { useCloudCharacterRow } from '../../../../../src/shared/cloud/sync/useCloudCharacterRow.js';

const row = (revision, notes = `rev ${revision}`) => ({ id: 'pc', sheet_revision: revision, data: { name: 'Fighter', notes } });
const settle = () => act(async () => {});

beforeEach(() => {
  m.get.mockReset().mockImplementation(async () => row(1));
  m.channel.mockReset();
});

test('reads the row once, tagged as the initial load, and follows nothing', async () => {
  const { result } = renderHook(() => useCloudCharacterRow('pc'));
  expect(result.current.loading).toBe(true);
  await settle();
  expect(result.current).toMatchObject({ row: row(1), loading: false, error: '' });
  expect(m.get).toHaveBeenCalledWith('pc', { reason: 'initial-load' });
  act(() => { window.dispatchEvent(new Event('online')); window.dispatchEvent(new Event('focus')); });
  await settle();
  expect(m.get).toHaveBeenCalledOnce();
  expect(m.channel).not.toHaveBeenCalled();
});

test('a newer row handed back by the sheet replaces it; another character\'s never does', async () => {
  const { result } = renderHook(() => useCloudCharacterRow('pc'));
  await settle();
  act(() => result.current.replaceRow(row(4, 'from the GM')));
  expect(result.current.row.data.notes).toBe('from the GM');
  act(() => result.current.replaceRow({ ...row(9), id: 'other' }));
  act(() => result.current.replaceRow({ id: 'pc', sheet_revision: 10 }));
  expect(result.current.row.sheet_revision).toBe(4);
});

test('a deleted character empties the view', async () => {
  const { result } = renderHook(() => useCloudCharacterRow('pc'));
  await settle();
  act(() => result.current.markDeleted());
  expect(result.current).toMatchObject({ row: null, loading: false, error: 'This sheet no longer exists.' });
});

test('a failed read shows the error; no id reads nothing', async () => {
  m.get.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useCloudCharacterRow('pc'));
  await settle();
  expect(result.current).toMatchObject({ row: null, loading: false, error: 'offline' });
  m.get.mockClear();
  const none = renderHook(() => useCloudCharacterRow(null));
  await settle();
  expect(none.result.current).toMatchObject({ row: null, loading: false, error: 'No sheet id.' });
  expect(m.get).not.toHaveBeenCalled();
});
