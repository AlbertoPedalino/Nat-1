import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const eq = vi.fn(async () => ({ error: null }));
  const remove = vi.fn(async () => ({ error: null }));
  const list = vi.fn(async () => ({ data: [], error: null }));
  const upload = vi.fn(async () => ({ error: null }));
  const bucket = { list, remove, upload };
  const client = {
    from: vi.fn(() => ({ delete: vi.fn(() => ({ eq })) })),
    storage: { from: vi.fn(() => bucket) },
  };
  return { bucket, client, eq, list, remove, upload };
});

vi.mock('./supabaseClient.js', () => ({
  requireClient: () => mocks.client,
}));

import {
  deleteCampaignMapImages,
  deleteScene,
  deleteToken,
  removeSceneImage,
  replaceSceneImage,
  setTokenVisibility,
} from './vtt.js';

describe('VTT Storage cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockResolvedValue({ error: null });
    mocks.list.mockResolvedValue({ data: [], error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.upload.mockResolvedValue({ error: null });
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

  test('replacing a battlemap persists the new path and removes the previous file', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1234);
    const row = {
      id: 's1', campaign_id: 'c1', name: 'Scene', image_path: 'c1/s1/ya-map.webp',
      background_path: 'c1/s1/background.webp', shown_image: 'map', grid: {},
    };
    const single = vi.fn(async () => ({ data: row, error: null }));
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.client.from.mockReturnValueOnce({ update });

    const result = await replaceSceneImage({
      id: 's1', campaignId: 'c1', imagePath: 'c1/s1/old-map.webp',
      backgroundPath: 'c1/s1/background.webp', shownImage: 'map',
    }, 'map', { name: 'Map.webp' });

    expect(mocks.upload).toHaveBeenCalledWith('c1/s1/ya-map.webp', expect.anything(), expect.anything());
    expect(update).toHaveBeenCalledWith({ image_path: 'c1/s1/ya-map.webp', shown_image: 'map' });
    expect(mocks.remove).toHaveBeenCalledWith(['c1/s1/old-map.webp']);
    expect(result.scene.imagePath).toBe('c1/s1/ya-map.webp');
    expect(result.cleanupError).toBeNull();
    now.mockRestore();
  });

  test('removing the active background clears its column, switches to the map and removes its file', async () => {
    const row = {
      id: 's1', campaign_id: 'c1', name: 'Scene', image_path: 'c1/s1/map.webp',
      background_path: null, shown_image: 'map', grid: {},
    };
    const single = vi.fn(async () => ({ data: row, error: null }));
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.client.from.mockReturnValueOnce({ update });

    const result = await removeSceneImage({
      id: 's1', campaignId: 'c1', imagePath: 'c1/s1/map.webp',
      backgroundPath: 'c1/s1/background.webp', shownImage: 'background',
    }, 'background');

    expect(update).toHaveBeenCalledWith({ background_path: null, shown_image: 'map' });
    expect(mocks.remove).toHaveBeenCalledWith(['c1/s1/background.webp']);
    expect(result.scene.backgroundPath).toBeNull();
  });

  test('replacing a background updates only its slot and removes the old background', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(5678);
    const newPath = `c1/s1/${(5678).toString(36)}-room.png`;
    const row = {
      id: 's1', campaign_id: 'c1', name: 'Scene', image_path: 'c1/s1/map.webp',
      background_path: newPath, shown_image: 'background', grid: {},
    };
    const single = vi.fn(async () => ({ data: row, error: null }));
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.client.from.mockReturnValueOnce({ update });

    await replaceSceneImage({
      id: 's1', campaignId: 'c1', imagePath: 'c1/s1/map.webp',
      backgroundPath: 'c1/s1/old-background.webp', shownImage: 'map',
    }, 'background', { name: 'Room.png' });

    expect(update).toHaveBeenCalledWith({ background_path: newPath, shown_image: 'background' });
    expect(mocks.remove).toHaveBeenCalledWith(['c1/s1/old-background.webp']);
    now.mockRestore();
  });

  test('removing the active battlemap switches to an available background', async () => {
    const row = {
      id: 's1', campaign_id: 'c1', name: 'Scene', image_path: null,
      background_path: 'c1/s1/background.webp', shown_image: 'background', grid: {},
    };
    const single = vi.fn(async () => ({ data: row, error: null }));
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mocks.client.from.mockReturnValueOnce({ update });

    await removeSceneImage({
      id: 's1', campaignId: 'c1', imagePath: 'c1/s1/map.webp',
      backgroundPath: 'c1/s1/background.webp', shownImage: 'map',
    }, 'map');

    expect(update).toHaveBeenCalledWith({ image_path: null, shown_image: 'background' });
    expect(mocks.remove).toHaveBeenCalledWith(['c1/s1/map.webp']);
  });

  test('campaign cleanup removes direct files and every scene folder', async () => {
    mocks.list.mockImplementation(async (folder) => {
      if (folder === 'c1') {
        return {
          data: [
            { id: null, metadata: null, name: 's1' },
            { id: null, metadata: null, name: 's2' },
            { id: 'legacy', name: 'legacy.webp' },
          ],
          error: null,
        };
      }
      if (folder === 'c1/s1') return { data: [{ id: 'map', name: 'map.webp' }], error: null };
      if (folder === 'c1/s2') return { data: [{ id: 'bg', name: 'background.webp' }], error: null };
      return { data: [], error: null };
    });

    await deleteCampaignMapImages('c1');

    expect(mocks.remove).toHaveBeenCalledWith(['c1/legacy.webp']);
    expect(mocks.remove).toHaveBeenCalledWith(['c1/s1/map.webp']);
    expect(mocks.remove).toHaveBeenCalledWith(['c1/s2/background.webp']);
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
