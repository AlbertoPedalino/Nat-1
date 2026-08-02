import { requireClient } from './supabaseClient.js';
import {
  mapImagePath,
  normalizeGrid,
  normalizeLayer,
  sanitizeName,
  toScene,
  toToken,
  toTokenPatch,
} from '../vtt/scene.js';

// Cloud-only feature: scenes and tokens live in Postgres, with no local copy and
// no JSON payload. That is why this module does not go through
// cloudSectionCore/sectionDescriptors — there is nothing to snapshot or push.

const MAP_BUCKET = 'map-images';
const SIGNED_URL_TTL = 60 * 60;

export async function listScenes(campaignId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_scenes')
    .select('id, campaign_id, name, image_path, grid, updated_at')
    .eq('campaign_id', campaignId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toScene).filter(Boolean);
}

export async function fetchScene(sceneId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_scenes')
    .select('id, campaign_id, name, image_path, grid, updated_at')
    .eq('id', sceneId)
    .maybeSingle();
  if (error) throw error;
  return toScene(data);
}

export async function createScene(campaignId, name) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_scenes')
    .insert({ campaign_id: campaignId, name: sanitizeName(name), grid: normalizeGrid(null) })
    .select('id, campaign_id, name, image_path, grid, updated_at')
    .single();
  if (error) throw error;
  return toScene(data);
}

export async function updateScene(sceneId, { name, grid, imagePath } = {}) {
  const supabase = requireClient();
  const patch = {};
  if (name !== undefined) patch.name = sanitizeName(name);
  if (grid !== undefined) patch.grid = normalizeGrid(grid);
  if (imagePath !== undefined) patch.image_path = imagePath || null;
  if (!Object.keys(patch).length) return null;

  const { data, error } = await supabase
    .from('map_scenes')
    .update(patch)
    .eq('id', sceneId)
    .select('id, campaign_id, name, image_path, grid, updated_at')
    .single();
  if (error) throw error;
  return toScene(data);
}

export async function deleteScene(sceneId) {
  const supabase = requireClient();
  const { error } = await supabase.from('map_scenes').delete().eq('id', sceneId);
  if (error) throw error;
}

// RLS decides what comes back: a player never receives the GM layer, so this is
// the same call for both roles.
export async function listTokens(sceneId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_tokens')
    .select('id, scene_id, layer, x, y, w, h, z, character_id, label, color, image_path, updated_at')
    .eq('scene_id', sceneId)
    .order('z', { ascending: true });
  if (error) throw error;
  return (data || []).map(toToken).filter(Boolean);
}

export async function createToken(sceneId, token = {}) {
  const supabase = requireClient();
  const row = {
    scene_id: sceneId,
    layer: normalizeLayer(token.layer),
    character_id: token.characterId || null,
    ...toTokenPatch(token),
  };
  const { data, error } = await supabase
    .from('map_tokens')
    .insert(row)
    .select('id, scene_id, layer, x, y, w, h, z, character_id, label, color, image_path, updated_at')
    .single();
  if (error) throw error;
  return toToken(data);
}

// One write per move, called on drop. Live dragging goes over a broadcast
// channel instead, so the database sees a single row version per gesture.
export async function updateToken(tokenId, patch) {
  const supabase = requireClient();
  const row = toTokenPatch(patch);
  if (!Object.keys(row).length) return null;

  const { data, error } = await supabase
    .from('map_tokens')
    .update(row)
    .eq('id', tokenId)
    .select('id, scene_id, layer, x, y, w, h, z, character_id, label, color, image_path, updated_at')
    .single();
  if (error) throw error;
  return toToken(data);
}

export async function deleteToken(tokenId) {
  const supabase = requireClient();
  const { error } = await supabase.from('map_tokens').delete().eq('id', tokenId);
  if (error) throw error;
}

export async function uploadMapImage(campaignId, sceneId, file) {
  const supabase = requireClient();
  const path = mapImagePath(campaignId, sceneId, file?.name);
  if (!path) throw new Error('Missing campaign or scene for this map image.');

  const { error } = await supabase.storage
    .from(MAP_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return path;
}

// The bucket is private, so the editor renders through a signed URL that has to
// be refreshed; callers keep the path, never the URL.
export async function signMapImage(path, expiresIn = SIGNED_URL_TTL) {
  if (!path) return null;
  const supabase = requireClient();
  const { data, error } = await supabase.storage.from(MAP_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function deleteMapImage(path) {
  if (!path) return;
  const supabase = requireClient();
  const { error } = await supabase.storage.from(MAP_BUCKET).remove([path]);
  if (error) throw error;
}
