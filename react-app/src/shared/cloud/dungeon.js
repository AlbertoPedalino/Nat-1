// The dungeon key, in the database.
//
// Its own table rather than a field on the scene: a player may read the live
// scene row, and the key is every trap and every hoard on the map. The policy on
// `map_dungeons` is GM-only, which is the only place that can be enforced.

import { requireClient } from './supabaseClient.js';

const COLUMNS = 'scene_id, key, fights, updated_at';

function toDungeon(row) {
  if (!row?.scene_id) return null;
  return {
    sceneId: row.scene_id,
    key: row.key || null,
    fights: row.fights && typeof row.fights === 'object' ? row.fights : {},
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

// Upsert, because the first roll on a map is also the moment its row starts
// existing, and every roll after that is the same row again. Nothing here is
// NOT NULL, so a patch of one field is a patch of one field.
export async function saveSceneDungeon(sceneId, { key, fights } = {}) {
  if (!sceneId) throw new Error('A dungeon belongs to a scene.');
  const patch = { scene_id: sceneId };
  if (key !== undefined) patch.key = key;
  if (fights !== undefined) patch.fights = fights;

  const supabase = requireClient();
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
