import { beforeEach, expect, test, vi } from 'vitest';

// A chainable stand-in for the PostgREST builder: records every call and
// resolves to whatever `m.result` holds.
const m = vi.hoisted(() => ({ calls: [], result: { data: [], error: null } }));

vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => {
  const builder = () => {
    const query = {};
    for (const method of ['select', 'eq', 'in', 'order']) {
      query[method] = (...args) => { m.calls.push([method, ...args]); return query; };
    }
    query.maybeSingle = () => { m.calls.push(['maybeSingle']); return Promise.resolve(m.result); };
    query.then = (resolve, reject) => Promise.resolve(m.result).then(resolve, reject);
    return query;
  };
  const client = { from: (table) => { m.calls.push(['from', table]); return builder(); } };
  return { requireClient: () => client, supabase: client };
});

import {
  fetchSceneRevision, listDrawingIds, readLiveSceneId, listDrawingsByIds, listTokenRevisions, listTokensByIds,
} from '../../../../../src/shared/cloud/api/vtt.js';
import {
  listCharacterDigests, readCharacterSheets,
} from '../../../../../src/shared/cloud/api/characterDigests.js';
import { listFightRevisions, listFightVitals } from '../../../../../src/shared/cloud/api/encounterFights.js';

const selected = () => m.calls.find(([method]) => method === 'select')?.[1];

beforeEach(() => {
  m.calls = [];
  m.result = { data: [], error: null };
});

test.each([
  ['scene', () => fetchSceneRevision('s1'), 'map_scenes'],
  ['live scene', () => readLiveSceneId('c1'), 'campaign_live_scenes'],
  ['pieces', () => listTokenRevisions('s1'), 'map_tokens'],
  ['strokes', () => listDrawingIds('s1'), 'map_drawings'],
  ['character digests', () => listCharacterDigests({ campaignId: 'c1' }), 'character_digests'],
  ['fights', () => listFightRevisions(['f1']), 'encounter_fights'],
])('the %s version check reads no payload columns', async (_, read, table) => {
  await read();
  expect(m.calls[0]).toEqual(['from', table]);
  expect(selected()).not.toMatch(/\b(fog|data|points|fight|grid|atmosphere|conditions|effects)\b/);
});

test('versions come back as comparable numbers, and an invisible scene as null', async () => {
  m.result = { data: [{ id: 'a', updated_at: '2026-09-24T10:00:00.123456+00:00' }], error: null };
  expect(await listTokenRevisions('s1')).toEqual([{ id: 'a', updatedAt: Date.parse('2026-09-24T10:00:00.123Z') }]);
  m.result = { data: null, error: null };
  expect(await fetchSceneRevision('s1')).toBeNull();
});

test('targeted reads stay inside the scene or campaign and skip an empty list', async () => {
  await listTokensByIds('s1', ['a', 'b']);
  expect(m.calls).toEqual(expect.arrayContaining([['eq', 'scene_id', 's1'], ['in', 'id', ['a', 'b']]]));
  m.calls = [];
  await listDrawingsByIds('s1', ['d']);
  expect(m.calls).toEqual(expect.arrayContaining([['eq', 'scene_id', 's1'], ['in', 'id', ['d']]]));
  m.calls = [];
  expect(await listTokensByIds('s1', [])).toEqual([]);
  expect(await listFightRevisions([])).toEqual([]);
  expect(m.calls).toEqual([]);
});

test('fight rows carry their version so the next check can compare', async () => {
  await listFightVitals(['f1']);
  expect(selected()).toContain('updated_at');
});

test('a failed check throws rather than reading as "nothing changed"', async () => {
  m.result = { data: null, error: new Error('refused') };
  await expect(listTokenRevisions('s1')).rejects.toThrow('refused');
  await expect(fetchSceneRevision('s1')).rejects.toThrow('refused');
});

test('the live-scene lookup reads one campaign row, and null means no live scene', async () => {
  m.result = { data: { scene_id: 'scene-b' }, error: null };
  expect(await readLiveSceneId('c1')).toBe('scene-b');
  expect(m.calls).toEqual(expect.arrayContaining([['eq', 'campaign_id', 'c1'], ['maybeSingle']]));
  m.result = { data: null, error: null };
  expect(await readLiveSceneId('c1')).toBeNull();
});

test('digests are read by campaign or by exact characters; a sheet is read only for max HP', async () => {
  m.result = {
    data: [{ character_id: 'pc', campaign_id: 'c1', owner: 'u1', row_revision: 4, digest: { name: 'Aria', hpBasis: 'h' } }],
    error: null,
  };
  const [digest] = await listCharacterDigests({ campaignId: 'c1' });
  expect(digest).toMatchObject({ characterId: 'pc', campaignId: 'c1', rowRevision: 4, name: 'Aria', hpBasis: 'h', source: 'server' });
  m.calls = [];
  await listCharacterDigests({ characterIds: ['c_b', 'c_a', 'bad id!'] });
  expect(m.calls).toEqual(expect.arrayContaining([['in', 'character_id', ['c_a', 'c_b']]]));
  m.calls = [];
  expect(await listCharacterDigests({ characterIds: [] })).toEqual([]);
  expect(m.calls).toEqual([]);
  m.result = { data: [], error: null };
  await readCharacterSheets(['pc']);
  expect(m.calls).toEqual(expect.arrayContaining([['from', 'characters'], ['select', 'id, data'], ['in', 'id', ['pc']]]));
});
