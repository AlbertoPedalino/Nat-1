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

// Upsert rather than insert: a map imported with its plan writes the row before
// anything has been rolled, and populating it later is the same row again.
export async function saveSceneDungeon(sceneId, { plan, origin, key, placed } = {}) {
  if (!sceneId) throw new Error('A dungeon belongs to a scene.');
  const supabase = requireClient();
  const patch = { scene_id: sceneId };
  if (plan !== undefined) patch.plan = plan;
  if (origin !== undefined) patch.origin = origin;
  if (key !== undefined) patch.key = key;
  if (placed !== undefined) patch.placed = placed;

  const { data, error } = await supabase
    .from('map_dungeons')
    .upsert(patch, { onConflict: 'scene_id' })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toDungeon(data);
}

export async function deleteSceneDungeon(sceneId) {
  if (!sceneId) return;
  const supabase = requireClient();
  const { error } = await supabase.from('map_dungeons').delete().eq('scene_id', sceneId);
  if (error) throw error;
}
