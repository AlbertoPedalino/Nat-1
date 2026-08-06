// The dungeon key, in the database.
//
// Its own table rather than a field on the scene: a player may read the live
// scene row, and the key is every trap and every hoard on the map. The policy on
// `map_dungeons` is GM-only, which is the only place that can be enforced.

import { requireClient } from './supabaseClient.js';

const COLUMNS = 'scene_id, plan, origin, key, placed, updated_at';

function toDungeon(row) {
  if (!row?.scene_id) return null;
  return {
    sceneId: row.scene_id,
    plan: row.plan || null,
    origin: {
      col: Math.round(Number(row.origin?.col) || 0),
      row: Math.round(Number(row.origin?.row) || 0),
    },
    key: row.key || null,
    placed: row.placed && typeof row.placed === 'object' ? row.placed : {},
    updatedAt: Date.parse(row.updated_at) || 0,
  };
}

export async function readSceneDungeon(sceneId) {
  if (!sceneId) return null;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_dungeons')
    .select(COLUMNS)
    .eq('scene_id', sceneId)
    .maybeSingle();
  if (error) throw error;
  return toDungeon(data);
}

// The plan arriving with the map: the row is written whole, and written again
// whole if the same map is imported twice.
//
// An upsert has to carry the plan even when the row already exists. Postgres
// evaluates the insert before it discovers the conflict, so a patch without one
// is rejected by the column's own NOT NULL before it ever gets as far as
// updating — which is why rolling the rooms is a separate call below and not
// this one with fewer fields.
export async function saveSceneDungeon(sceneId, { plan, origin, key, placed } = {}) {
  if (!sceneId) throw new Error('A dungeon belongs to a scene.');
  if (!plan) throw new Error('A dungeon needs the plan the generator exported.');
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_dungeons')
    .upsert({
      scene_id: sceneId,
      plan,
      origin: origin || { col: 0, row: 0 },
      key: key ?? null,
      placed: placed || {},
    }, { onConflict: 'scene_id' })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toDungeon(data);
}

// Rolling the rooms, or noting what has been put on the board: an update of the
// row the import already wrote, so the plan stays where it is rather than being
// sent back with every change.
export async function updateSceneDungeon(sceneId, { key, placed, origin } = {}) {
  if (!sceneId) throw new Error('A dungeon belongs to a scene.');
  const patch = {};
  if (key !== undefined) patch.key = key;
  if (placed !== undefined) patch.placed = placed;
  if (origin !== undefined) patch.origin = origin;
  if (!Object.keys(patch).length) return null;

  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_dungeons')
    .update(patch)
    .eq('scene_id', sceneId)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This map has no imported plan to fill in.');
  return toDungeon(data);
}

export async function deleteSceneDungeon(sceneId) {
  if (!sceneId) return;
  const supabase = requireClient();
  const { error } = await supabase.from('map_dungeons').delete().eq('scene_id', sceneId);
  if (error) throw error;
}
