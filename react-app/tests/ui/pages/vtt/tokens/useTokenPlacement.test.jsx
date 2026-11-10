import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { useTokenPlacement } from '../../../../../src/pages/vtt/tokens/useTokenPlacement.js';
import { createToken } from '../../../../../src/shared/cloud/api/vttTokens.js';
import { getInstanceFight, saveInstanceFight } from '../../../../../src/shared/cloud/api/encounterFights.js';
import { persistFights } from '../../../../../src/pages/encounterbuilder/state/storage.js';

vi.mock('../../../../../src/shared/cloud/api/vttTokens.js', async (importOriginal) => ({
  ...(await importOriginal()),
  createToken: vi.fn(async (sceneId, row) => ({ id: `t${row.x}-${row.y}`, ...row })),
}));

vi.mock('../../../../../src/shared/cloud/api/encounterFights.js', () => ({
  getInstanceFight: vi.fn(async () => null),
  saveInstanceFight: vi.fn(async () => null),
  deleteInstanceFight: vi.fn(async () => {}),
}));

const SCENE = { id: 's1', campaignId: 'c1', grid: { type: 'square', size: 70 }, playArea: { x: 2, y: 3, w: 4, h: 4 } };

function setup({ shown = 'battlemap', tokens: initial = [] } = {}) {
  const notify = vi.fn();
  const { result } = renderHook(() => {
    const [tokens, setTokens] = useState(initial);
    const placement = useTokenPlacement({
      scene: SCENE, role: { isGm: true }, notify, activeLayer: 'map', tokens, setTokens,
      roster: [], monsterDb: { monsters: [] }, dungeon: {}, setBusy: vi.fn(), setImportOpen: vi.fn(),
      setPlacementDrag: vi.fn(), shownImageForViewport: shown,
    });
    return { tokens, placement };
  });
  return { result, notify };
}

test('with no view to centre on, a new marker takes the first free cell of the play area', async () => {
  const { result } = setup({ tokens: [{ id: 'old', x: 2, y: 3 }] });
  await act(() => result.current.placement.handleAddToken({ label: ' Chest ' }));
  expect(createToken).toHaveBeenLastCalledWith('s1', expect.objectContaining({ x: 3, y: 3, layer: 'map', label: 'Chest' }));
  expect(result.current.tokens.map((t) => t.id)).toEqual(['old', 't3-3']);
});

test('nothing is placed while a background picture is on show', async () => {
  createToken.mockClear();
  const { result, notify } = setup({ shown: 'background' });
  await act(() => result.current.placement.handleAddToken({}));
  expect(createToken).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith('warning', 'Switch to the battlemap before placing or moving pieces.');
});

const LAUNCHED = {
  id: 'f9',
  name: 'Bridge',
  encounterId: 'e1',
  fight: { combatants: [{ id: 0, name: 'Goblin', type: 'monster' }], currentTurn: 0, round: 1 },
};
const GOBLIN = [{ id: 0, name: 'Goblin', type: 'monster' }];

test('a fight launched before goes online ahead of its pieces when its row is missing', async () => {
  persistFights('enc_a', null, [LAUNCHED]);
  const order = [];
  getInstanceFight.mockResolvedValueOnce(null);
  saveInstanceFight.mockImplementationOnce(async () => { order.push('fight'); });
  createToken.mockImplementationOnce(async (sceneId, row) => { order.push('piece'); return { id: 'p1', ...row }; });
  const { result } = setup();
  await act(() => result.current.placement.handleImportEncounter(GOBLIN, { instanceId: 'enc_a', fightId: 'f9' }));
  expect(getInstanceFight).toHaveBeenCalledWith('f9');
  expect(saveInstanceFight).toHaveBeenCalledWith('enc_a', expect.objectContaining({ id: 'f9' }));
  expect(order).toEqual(['fight', 'piece']);
});

test('a fight already online is left as the database has it', async () => {
  persistFights('enc_a', null, [LAUNCHED]);
  saveInstanceFight.mockClear();
  getInstanceFight.mockResolvedValueOnce({ id: 'f9' });
  const { result } = setup();
  await act(() => result.current.placement.handleImportEncounter(GOBLIN, { instanceId: 'enc_a', fightId: 'f9' }));
  expect(saveInstanceFight).not.toHaveBeenCalled();
  expect(createToken).toHaveBeenLastCalledWith('s1', expect.objectContaining({ source_ref: 'enc_a:f9:0' }));
});

test('placing still happens, with a warning, when the fight cannot be put online', async () => {
  persistFights('enc_a', null, [LAUNCHED]);
  getInstanceFight.mockRejectedValueOnce(new Error('offline'));
  createToken.mockClear();
  const { result, notify } = setup();
  await act(() => result.current.placement.handleImportEncounter(GOBLIN, { instanceId: 'enc_a', fightId: 'f9' }));
  expect(notify).toHaveBeenCalledWith('warning', expect.stringContaining('its fight is not online'));
  expect(createToken).toHaveBeenCalledTimes(1);
});
