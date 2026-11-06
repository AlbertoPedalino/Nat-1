import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { useSceneDrawings } from '../../../../../src/pages/vtt/map/useSceneDrawings.js';
import { createDrawing, deleteDrawing } from '../../../../../src/shared/cloud/api/vttDrawings.js';

vi.mock('../../../../../src/shared/cloud/api/vttDrawings.js', () => ({
  createDrawing: vi.fn(async (sceneId, draft) => ({ id: 'new', createdBy: 'me', createdAt: 3, ...draft })),
  deleteDrawing: vi.fn(async () => {}),
  moveDrawing: vi.fn(async () => null),
  updateDrawing: vi.fn(async () => null),
}));

function setup({ isGm = false, drawings: initial = [] } = {}) {
  const notify = vi.fn();
  const { result } = renderHook(() => {
    const [drawings, setDrawings] = useState(initial);
    const marks = useSceneDrawings({
      scene: { id: 'scene-1' }, role: { isGm }, user: { id: 'me' }, notify,
      activeLayer: 'map', drawColor: '#d7ad52', drawWidth: 3, setDrawColor: vi.fn(), setAreaOptions: vi.fn(),
      drawings, setDrawings, beginDrawingWrite: () => () => [], reconcileContent: vi.fn(), sendDrag: vi.fn(), setLasers: vi.fn(),
    });
    return { drawings, marks };
  });
  return { result, notify };
}

test('a player stroke is saved on the tokens layer with the chosen ink, and shown', async () => {
  const { result } = setup();
  await act(() => result.current.marks.handleDrawEnd([[1, 1], [2, 2]]));
  expect(createDrawing).toHaveBeenLastCalledWith('scene-1', { points: [[1, 1], [2, 2]], color: '#d7ad52', width: 3, layer: 'tokens' });
  expect(result.current.drawings.map((d) => d.id)).toEqual(['new']);
});

test('a player can erase and undo only their own marks; undo takes the newest', async () => {
  const mine = { id: 'a', createdBy: 'me', createdAt: 1, layer: 'tokens', points: [[0, 0]] };
  const newer = { id: 'b', createdBy: 'me', createdAt: 2, layer: 'tokens', points: [[5, 5]] };
  const theirs = { id: 'c', createdBy: 'other', createdAt: 9, layer: 'tokens', points: [[9, 9]] };
  const { result } = setup({ drawings: [mine, newer, theirs] });
  expect(result.current.marks.erasable.map((d) => d.id)).toEqual(['a', 'b']);
  act(() => result.current.marks.handleUndoDrawing());
  await waitFor(() => expect(deleteDrawing).toHaveBeenLastCalledWith('b'));
  expect(result.current.drawings.map((d) => d.id)).toEqual(['a', 'c']);
});

test('a stroke whose realtime INSERT arrived before the write answered is shown once', async () => {
  // The echo got here first: the new row is already on the list.
  const echoed = { id: 'new', createdBy: 'me', createdAt: 3, layer: 'tokens', points: [[1, 1]] };
  const { result } = setup({ drawings: [echoed] });
  await act(() => result.current.marks.handleDrawEnd([[1, 1]]));
  expect(result.current.drawings.map((d) => d.id)).toEqual(['new']);
});
