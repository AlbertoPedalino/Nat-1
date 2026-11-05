import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { useTokenPlacement } from '../../../../../src/pages/vtt/tokens/useTokenPlacement.js';
import { createToken } from '../../../../../src/shared/cloud/api/vtt.js';

vi.mock('../../../../../src/shared/cloud/api/vtt.js', async (importOriginal) => ({
  ...(await importOriginal()),
  createToken: vi.fn(async (sceneId, row) => ({ id: `t${row.x}-${row.y}`, ...row })),
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
