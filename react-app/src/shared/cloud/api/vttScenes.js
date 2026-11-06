import { requireClient } from '../supabaseClient.js';
import { normalizeFog } from '../../vtt/map/fog.js';
import { normalizeImageAtmospheres } from '../../vtt/scene/atmosphere.js';
import { normalizeImageFilters } from '../../vtt/scene/imageFilters.js';
import {
  normalizeBackgrounds,
  normalizeGrid,
  normalizePlayArea,
  sanitizeName,
  toScene,
} from '../../vtt/scene/scene.js';
import { deleteSceneMapImages } from './vttMapImages.js';

// Cloud-only feature: scenes, tokens and drawings live in Postgres, with no
// local copy and no JSON payload. That is why the battle map's API modules
// (vttScenes, vttSceneTurns, vttScenePictures, vttTokens, vttDrawings,
// vttMapImages) do not go through cloudSectionCore/sectionDescriptors — there
// is nothing to snapshot or push.

const SCENE_COLUMNS = 'id, campaign_id, name, image_path, background_path, backgrounds, shown_image, grid, image_atmospheres, image_filters, fog, is_live, play_area, updated_at';

export async function listScenes(campaignId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_scenes')
    .select(SCENE_COLUMNS)
    .eq('campaign_id', campaignId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toScene).filter(Boolean);
}

// Which of these campaigns have a scene up right now: the campaign picker's
// "Live" badges. Read from the one-row-per-campaign projection
// (15_live_scenes.sql), so no scene row — fog and all — is fetched for it. RLS
// returns only campaigns the caller belongs to or runs.
export async function listLiveCampaignIds(campaignIds) {
  const ids = [...new Set((campaignIds || []).filter(Boolean).map(String))];
  if (!ids.length) return new Set();
  const { data, error } = await requireClient()
    .from('campaign_live_scenes')
    .select('campaign_id')
    .in('campaign_id', ids)
    .not('scene_id', 'is', null);
  if (error) throw error;
  return new Set((data || []).map((row) => row.campaign_id));
}

// The id of the scene a campaign is showing, or null. Read from the
// database's own projection (15_live_scenes.sql), a row of three columns.
export async function readLiveSceneId(campaignId) {
  const { data, error } = await requireClient()
    .from('campaign_live_scenes')
    .select('scene_id')
    .eq('campaign_id', campaignId)
    .maybeSingle();
  if (error) throw error;
  return data?.scene_id || null;
}

export async function fetchScene(sceneId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_scenes')
    .select(SCENE_COLUMNS)
    .eq('id', sceneId)
    .maybeSingle();
  if (error) throw error;
  return toScene(data);
}

// The scene's version alone: the recovery poll reads this and fetches the row
// (fog included) only when it moved. Null when the caller cannot see the scene.
export async function fetchSceneRevision(sceneId) {
  const { data, error } = await requireClient()
    .from('map_scenes')
    .select('id, updated_at')
    .eq('id', sceneId)
    .maybeSingle();
  if (error) throw error;
  return data ? Date.parse(data.updated_at) || 0 : null;
}

export async function createScene(campaignId, name) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_scenes')
    .insert({ campaign_id: campaignId, name: sanitizeName(name), grid: normalizeGrid(null) })
    .select(SCENE_COLUMNS)
    .single();
  if (error) throw error;
  return toScene(data);
}

export async function updateScene(sceneId, {
  name, grid, atmospheres, imageFilters, imagePath, backgroundPath, backgrounds, shownImage, fog, playArea,
} = {}) {
  const supabase = requireClient();
  const patch = {};
  if (name !== undefined) patch.name = sanitizeName(name);
  if (grid !== undefined) patch.grid = normalizeGrid(grid);
  if (atmospheres !== undefined) patch.image_atmospheres = normalizeImageAtmospheres(atmospheres);
  if (imageFilters !== undefined) patch.image_filters = normalizeImageFilters(imageFilters);
  if (imagePath !== undefined) patch.image_path = imagePath || null;
  if (backgroundPath !== undefined) patch.background_path = backgroundPath || null;
  if (backgrounds !== undefined) patch.backgrounds = normalizeBackgrounds(backgrounds);
  if (shownImage !== undefined) patch.shown_image = shownImage === 'background' ? 'background' : 'map';
  // Null clears it, which puts the whole scene back in play.
  if (playArea !== undefined) patch.play_area = normalizePlayArea(playArea);
  // Only the GM writes fog, so the whole blob can be replaced without the
  // conflict problem that made tokens one row each. Paint strokes go over
  // broadcast; this is the single write at the end of the stroke.
  if (fog !== undefined) patch.fog = normalizeFog(fog);
  if (!Object.keys(patch).length) return null;

  const { data, error } = await supabase
    .from('map_scenes')
    .update(patch)
    .eq('id', sceneId)
    .select(SCENE_COLUMNS)
    .single();
  if (error) throw error;
  return toScene(data);
}

// Through an RPC, not two updates: the "one live scene per campaign" index
// rejects a second live row, so clearing and setting have to share a
// transaction.
export async function setLiveScene(sceneId) {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('set_live_scene', { p_scene: sceneId });
  if (error) throw error;
  return toScene(Array.isArray(data) ? data[0] : data);
}

export async function clearLiveScene(campaignId) {
  const supabase = requireClient();
  const { error } = await supabase.rpc('clear_live_scene', { p_campaign: campaignId });
  if (error) throw error;
}

export async function deleteScene(sceneId, campaignId) {
  const supabase = requireClient();
  const { error } = await supabase.from('map_scenes').delete().eq('id', sceneId);
  if (error) throw error;

  // Postgres cascades tokens/drawings, but Storage is a different service and
  // has no foreign key. Delete the whole scene folder after the authoritative
  // row is gone; this also collects images orphaned by older app versions.
  let cleanupError = null;
  try {
    await deleteSceneMapImages(campaignId, sceneId);
  } catch (cause) {
    cleanupError = cause;
  }
  return { cleanupError };
}
