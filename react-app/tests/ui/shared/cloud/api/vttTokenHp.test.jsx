import { beforeEach, vi } from 'vitest';
import { createToken, setTokenHp, setTokenSecret } from '../../../../../src/shared/cloud/api/vtt.js';

const calls = vi.hoisted(() => []);

vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => {
  const client = {
    from: (table) => ({
      insert: (row) => {
        calls.push({ table, op: 'insert', row });
        return { select: () => ({ single: async () => ({ data: { ...row, id: 'piece-1' }, error: null }) }) };
      },
      upsert: async (row) => { calls.push({ table, op: 'upsert', row }); return { error: null }; },
      update: (row) => ({ eq: async () => { calls.push({ table, op: 'update', row }); return { error: null }; } }),
      delete: () => ({ eq: async () => { calls.push({ table, op: 'delete' }); return { error: null }; } }),
    }),
  };
  return { supabase: client, requireClient: () => client };
});

beforeEach(() => { calls.length = 0; });

test('a new piece never puts its hit points on the public row', async () => {
  const created = await createToken('scene-1', { label: 'Mimic', hp_current: 40, hp_max: 40, show_hp: false });
  const insert = calls.find((call) => call.table === 'map_tokens' && call.op === 'insert');
  expect(insert.row).not.toHaveProperty('hp_current');
  expect(insert.row).not.toHaveProperty('hp_max');
  expect(calls).toContainEqual({
    table: 'map_token_secrets', op: 'upsert', row: { token_id: 'piece-1', hp_current: 40, hp_max: 40 },
  });
  // The GM who placed it still has the real values in hand.
  expect(created).toMatchObject({ id: 'piece-1', hpCurrent: 40, hpMax: 40 });
});

test('a character piece writes no private hit points: the sheet owns them', async () => {
  await createToken('scene-1', { characterId: 'hero', hp_current: 9, hp_max: 20 });
  expect(calls.some((call) => call.table === 'map_token_secrets')).toBe(false);
});

test('standalone HP go only to the GM-only source', async () => {
  await setTokenHp('piece-1', { hpCurrent: '12', hpMax: 30.4 });
  expect(calls).toEqual([{ table: 'map_token_secrets', op: 'upsert', row: { token_id: 'piece-1', hp_current: 12, hp_max: 30 } }]);
});

test('clearing a secret label keeps the private hit points in the same row', async () => {
  await setTokenSecret('piece-1', '');
  expect(calls).toEqual([{ table: 'map_token_secrets', op: 'update', row: { label: null } }]);
});
