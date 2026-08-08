import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const eq = vi.fn(async () => ({ error: null }));
  const remove = vi.fn(async () => ({ error: null }));
  const list = vi.fn(async () => ({ data: [], error: null }));
  const bucket = { list, remove };
  const client = {
    from: vi.fn(() => ({ delete: vi.fn(() => ({ eq })) })),
    storage: { from: vi.fn(() => bucket) },
  };
  return { bucket, client, eq, list, remove };
});

vi.mock('./supabaseClient.js', () => ({
  requireClient: () => mocks.client,
}));

import { deleteScene, deleteToken, setTokenVisibility } from './vtt.js';

describe('VTT Storage cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockResolvedValue({ error: null });
    mocks.list.mockResolvedValue({ data: [], error: null });
    mocks.remove.mockResolvedValue({ error: null });
  });

  test('deleting a scene also removes every direct file in its safe Storage folder', async () => {
    mocks.list.mockResolvedValue({
      data: [
        { id: 'map-file', name: 'map.webp' },
        { id: 'token-file', name: 'handout.png' },
        { id: null, name: 'unexpected-folder' },
      ],
      error: null,
    });

    const result = await deleteScene('s1', 'c1');

    expect(mocks.client.from).toHaveBeenCalledWith('map_scenes');
    expect(mocks.eq).toHaveBeenCalledWith('id', 's1');
    expect(mocks.list).toHaveBeenCalledWith('c1/s1', expect.objectContaining({ limit: 100, offset: 0 }));
    expect(mocks.remove).toHaveBeenCalledWith(['c1/s1/map.webp', 'c1/s1/handout.png']);
    expect(result.cleanupError).toBeNull();
  });

  test('deleting an uploaded image token cleans its exact file without failing the row delete', async () => {
    const cleanupFailure = new Error('Storage unavailable');
    mocks.remove.mockResolvedValue({ error: cleanupFailure });

    const result = await deleteToken('token-1', 'c1/s1/token.png');

    expect(mocks.client.from).toHaveBeenCalledWith('map_tokens');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'token-1');
    expect(mocks.remove).toHaveBeenCalledWith(['c1/s1/token.png']);
    expect(result.cleanupError).toBe(cleanupFailure);
  });

  test('visibility is stored separately without changing a normal editing layer', async () => {
    const row = {
      id: 'prop-1', scene_id: 's1', layer: 'map', hidden_from_players: true, x: 1, y: 2, w: 1, h: 1,
    };
    const single = vi.fn(async () => ({ data: row, error: null }));
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.client.from.mockReturnValueOnce({ update });

    const token = await setTokenVisibility('prop-1', true, 'map');

    expect(update).toHaveBeenCalledWith({ hidden_from_players: true });
    expect(token).toEqual(expect.objectContaining({ id: 'prop-1', layer: 'map', hiddenFromPlayers: true }));
  });

  test('revealing a legacy GM-layer row gives it a public editing layer', async () => {
    const row = {
      id: 'legacy-1', scene_id: 's1', layer: 'tokens', hidden_from_players: false, x: 1, y: 2, w: 1, h: 1,
    };
    const single = vi.fn(async () => ({ data: row, error: null }));
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.client.from.mockReturnValueOnce({ update });

    await setTokenVisibility('legacy-1', false, 'gm');

    expect(update).toHaveBeenCalledWith({ hidden_from_players: false, layer: 'tokens' });
  });
});
