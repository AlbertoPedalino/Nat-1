import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const m = vi.hoisted(() => ({
  listTokenSecretHp: vi.fn(),
  listFightVitals: vi.fn(),
  listFightRevisions: vi.fn(),
  channel: null,
}));

vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: { channel: () => m.channel, removeChannel: vi.fn() },
}));
vi.mock('../../../../../src/shared/cloud/api/vtt.js', () => ({ listTokenSecretHp: m.listTokenSecretHp }));
vi.mock('../../../../../src/shared/cloud/api/encounterFights.js', () => ({
  listFightVitals: m.listFightVitals,
  listFightRevisions: m.listFightRevisions,
}));

import { useGmTokenVitals } from '../../../../../src/pages/vtt/tokens/useGmTokenVitals.js';

const fight = (id, at, hp = 10) => ({
  id, instance_id: 'inst', updated_at: at, fight: { combatants: [{ id: 'c', hp }] },
});
const tokens = [
  { id: 't1', sourceRef: 'inst:f1:c' },
  { id: 't2', sourceRef: 'inst:f2:c' },
];

beforeEach(() => {
  m.channel = { on() { return this; }, subscribe() { return this; } };
  m.listTokenSecretHp.mockReset().mockResolvedValue({});
  m.listFightVitals.mockReset().mockResolvedValue([
    fight('f1', '2026-09-24T10:00:00.000000+00:00'),
    fight('f2', '2026-09-24T10:00:00.000000+00:00'),
  ]);
  m.listFightRevisions.mockReset();
});

async function openVitals() {
  const view = renderHook(() => useGmTokenVitals({ sceneId: 'scene', tokens, enabled: true }));
  await waitFor(() => expect(m.listFightVitals).toHaveBeenCalled());
  await act(async () => {});
  m.listFightVitals.mockClear();
  return view;
}

test('unchanged fights are not downloaded again by the recovery poll', async () => {
  const { result } = await openVitals();
  m.listFightRevisions.mockResolvedValue([
    { id: 'f1', updated_at: '2026-09-24T10:00:00+00:00' },
    { id: 'f2', updated_at: '2026-09-24T10:00:00.000+00:00' },
  ]);
  await act(async () => { await result.current.reconcile(); });
  expect(m.listFightRevisions).toHaveBeenCalledWith(['f1', 'f2']);
  expect(m.listFightVitals).not.toHaveBeenCalled();
  expect(m.listTokenSecretHp).toHaveBeenCalled();
});

test('only a fight whose version moved is read again', async () => {
  const { result } = await openVitals();
  m.listFightRevisions.mockResolvedValue([
    { id: 'f1', updated_at: '2026-09-24T10:00:05+00:00' },
    { id: 'f2', updated_at: '2026-09-24T10:00:00+00:00' },
  ]);
  m.listFightVitals.mockResolvedValue([fight('f1', '2026-09-24T10:00:05+00:00', 3)]);
  await act(async () => { await result.current.reconcile(); });
  expect(m.listFightVitals).toHaveBeenCalledWith(['f1']);
});

test('a fight that no longer exists is dropped without any download', async () => {
  const { result } = await openVitals();
  m.listFightRevisions.mockResolvedValue([{ id: 'f1', updated_at: '2026-09-24T10:00:00+00:00' }]);
  await act(async () => { await result.current.reconcile(); });
  expect(m.listFightVitals).not.toHaveBeenCalled();
  // A second pass sees f2 as gone already, and still downloads nothing.
  await act(async () => { await result.current.reconcile(); });
  expect(m.listFightVitals).not.toHaveBeenCalled();
});

test('a failed version check keeps what is held', async () => {
  const { result } = await openVitals();
  m.listFightRevisions.mockRejectedValue(new Error('offline'));
  await act(async () => { await result.current.reconcile(); });
  expect(m.listFightVitals).not.toHaveBeenCalled();
});
