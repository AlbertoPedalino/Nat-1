import { requireClient } from '../supabaseClient.js';
import { toSceneTurns } from '../../vtt/tokens/initiative.js';

// Which fight the scene shows as its initiative (20_scene_turns.sql). Null when
// it shows none; players read it only while the scene is live.
export async function fetchSceneTurns(sceneId) {
  const { data, error } = await requireClient()
    .from('map_scene_turns')
    .select('scene_id, instance_id, fight_id, round')
    .eq('scene_id', sceneId)
    .maybeSingle();
  if (error) throw error;
  return toSceneTurns(data);
}

// The GM's choice; `null` shows none. The database checks the fight is the
// campaign GM's and fills in its round.
export async function setSceneTurnFight(sceneId, choice) {
  const { data, error } = await requireClient()
    .from('map_scene_turns')
    .upsert({
      scene_id: sceneId,
      instance_id: choice?.instanceId ? String(choice.instanceId) : null,
      fight_id: choice?.fightId ? String(choice.fightId) : null,
    }, { onConflict: 'scene_id' })
    .select('scene_id, instance_id, fight_id, round')
    .single();
  if (error) throw error;
  return toSceneTurns(data);
}
