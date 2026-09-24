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
  fetchSceneRevision, listDrawingIds, listLiveSceneIds, listDrawingsByIds, listTokenRevisions, listTokensByIds,
} from '../../../../../src/shared/cloud/api/vtt.js';
import {
  listCampaignCharacterRevisions, listCampaignCharactersByIds,
} from '../../../../../src/shared/cloud/api/campaigns.js';
import { listFightRevisions, listFightVitals } from '../../../../../src/shared/cloud/api/encounterFights.js';

const selected = () => m.calls.find(([method]) => method === 'select')?.[1];

beforeEach(() => {
  m.calls = [];
  m.result = { data: [], error: null };
});

test.each([
  ['scene', () => fetchSceneRevision('s1'), 'map_scenes'],
  ['live scene', () => listLiveSceneIds('c1'), 'map_scenes'],
  ['pieces', () => listTokenRevisions('s1'), 'map_tokens'],
  ['strokes', () => listDrawingIds('s1'), 'map_drawings'],
  ['sheets', () => listCampaignCharacterRevisions('c1'), 'characters'],
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
  await listCampaignCharactersByIds('c1', ['pc']);
  expect(m.calls).toEqual(expect.arrayContaining([['eq', 'campaign_id', 'c1'], ['in', 'id', ['pc']]]));
  m.calls = [];
  expect(await listTokensByIds('s1', [])).toEqual([]);
  expect(await listCampaignCharactersByIds('c1', [])).toEqual([]);
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

test('the live-scene lookup is scoped to one campaign', async () => {
  await listLiveSceneIds('c1');
  expect(m.calls).toEqual(expect.arrayContaining([['eq', 'is_live', true], ['eq', 'campaign_id', 'c1']]));
});
