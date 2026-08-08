import { requireClient } from './supabaseClient.js';
import { normalizeConditions } from '../character/conditions.js';
import {
  isDrawable,
  normalizePoints,
  sanitizeNoteText,
  simplifyStroke,
  toDrawing,
} from '../vtt/drawing.js';
import { normalizeFog } from '../vtt/fog.js';
import {
  mapImageFolder,
  mapImagePath,
  normalizeGrid,
  normalizeLayer,
  normalizePlayArea,
  sanitizeName,
  toScene,
  toToken,
  toTokenPatch,
} from '../vtt/scene.js';

// Cloud-only feature: scenes and tokens live in Postgres, with no local copy and
// no JSON payload. That is why this module does not go through
// cloudSectionCore/sectionDescriptors — there is nothing to snapshot or push.

const MAP_BUCKET = 'map-images';
// Long enough to cover a session. The URL is the cache key in the browser, so a
// short life meant a fresh signature — and a fresh download of the same
// megabytes — on every reload.
const SIGNED_URL_TTL = 8 * 60 * 60;
// Re-signed a little early, so a link never expires in the middle of a scene.
const SIGNED_URL_MARGIN_MS = 15 * 60 * 1000;
const SIGNED_URL_KEY = 'gb:vtt:signed-url:';
const SCENE_COLUMNS = 'id, campaign_id, name, image_path, background_path, shown_image, grid, fog, is_live, play_area, updated_at';
const TOKEN_COLUMNS = 'id, scene_id, layer, hidden_from_players, x, y, w, h, z, character_id, label, color, image_path, image_url, icon_key, icon_stroke_width, rotation, hp_current, hp_max, conditions, effects, source_ref, show_hp, created_by, updated_at';
const DRAWING_COLUMNS = 'id, scene_id, layer, points, color, width, text, created_by, created_at';

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

// Every live scene the caller may see. For a player this is how they find the
// table at all: they cannot list a campaign's scenes, only the one being shown.
export async function listLiveScenes() {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_scenes')
    .select(SCENE_COLUMNS)
    .eq('is_live', true)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toScene).filter(Boolean);
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
  name, grid, imagePath, backgroundPath, shownImage, fog, playArea,
} = {}) {
  const supabase = requireClient();
  const patch = {};
  if (name !== undefined) patch.name = sanitizeName(name);
  if (grid !== undefined) patch.grid = normalizeGrid(grid);
  if (imagePath !== undefined) patch.image_path = imagePath || null;
  if (backgroundPath !== undefined) patch.background_path = backgroundPath || null;
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

// RLS decides what comes back: a player never receives the GM layer, so this is
// the same call for both roles.
export async function listTokens(sceneId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_tokens')
    .select(TOKEN_COLUMNS)
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
    hidden_from_players: token.hiddenFromPlayers === true || token.layer === 'gm',
    character_id: token.characterId || null,
    ...toTokenPatch({
      ...token,
      icon_key: token.iconKey ?? token.icon_key,
      icon_stroke_width: token.iconStrokeWidth ?? token.icon_stroke_width,
    }),
  };
  const { data, error } = await supabase
    .from('map_tokens')
    .insert(row)
    .select(TOKEN_COLUMNS)
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
    .select(TOKEN_COLUMNS)
    .single();
  if (error) throw error;
  return toToken(data);
}

// The encounter builder writing into the piece a combatant stands for.
//
// By reference rather than by id, because the builder has never seen the map: it
// knows which combatant it changed, and `source_ref` is what says which piece
// that is. RLS decides the rest — only the campaign's GM can write these rows,
// which is exactly who is running the fight.
//
// Answers with how many pieces it reached, so a fight whose creatures were never
// dropped on a board is silence rather than an error.
export async function updateTokensBySourceRef(sourceRef, patch) {
  const row = toTokenPatch(patch);
  if (!sourceRef || !Object.keys(row).length) return 0;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_tokens')
    .update(row)
    .eq('source_ref', sourceRef)
    .select('id');
  if (error) throw error;
  return (data || []).length;
}

// Visibility is not an editing layer. Keeping it in its own column means a map
// object can be hidden and later revealed without silently becoming a token.
// A legacy row whose layer itself is `gm` has no public layer to restore, so
// revealing that one falls back to the ordinary token layer.
export async function setTokenVisibility(tokenId, hidden, currentLayer = 'tokens') {
  const supabase = requireClient();
  const layer = normalizeLayer(currentLayer);
  const { data, error } = await supabase
    .from('map_tokens')
    .update({
      hidden_from_players: Boolean(hidden),
      ...(!hidden && layer === 'gm' ? { layer: 'tokens' } : {}),
    })
    .eq('id', tokenId)
    .select(TOKEN_COLUMNS)
    .single();
  if (error) throw error;
  return toToken(data);
}

// Conditions go through an RPC so a player can mark an enemy without being
// given the row: RLS grants whole rows, and a policy wide enough for this would
// also let them drag the creature away.
// Effects go the same way conditions do, and for the same reason: a player may
// mark a monster without being handed the monster.
export async function setTokenEffects(tokenId, effects) {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('set_token_effects', {
    p_token: tokenId,
    p_effects: effects || [],
  });
  if (error) throw error;
  return toToken(Array.isArray(data) ? data[0] : data);
}

export async function setTokenConditions(tokenId, conditions) {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc('set_token_conditions', {
    p_token: tokenId,
    p_conditions: normalizeConditions(conditions),
  });
  if (error) throw error;
  return toToken(Array.isArray(data) ? data[0] : data);
}

export async function deleteToken(tokenId, imagePath = null) {
  const supabase = requireClient();
  const { error } = await supabase.from('map_tokens').delete().eq('id', tokenId);
  if (error) throw error;

  // Only uploaded free-standing pictures have imagePath. Character portraits
  // and bestiary art belong elsewhere and are therefore never touched here.
  let cleanupError = null;
  if (imagePath) {
    try {
      await deleteMapImage(imagePath);
    } catch (cause) {
      cleanupError = cause;
    }
  }
  return { cleanupError };
}

// One row per stroke: undo deletes the last, realtime carries only the new one,
// and nothing rewrites a payload that grows all session.
export async function listDrawings(sceneId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_drawings')
    .select(DRAWING_COLUMNS)
    .eq('scene_id', sceneId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(toDrawing).filter(Boolean);
}

export async function createDrawing(sceneId, { points, color, width, layer, text } = {}) {
  const supabase = requireClient();
  const note = sanitizeNoteText(text);
  // A note is anchored by a single point and needs no simplification; a stroke
  // is worth storing only if it went somewhere.
  const simplified = note ? normalizePoints(points).slice(0, 1) : simplifyStroke(points);
  if (!isDrawable(simplified)) return null;
  const { data, error } = await supabase
    .from('map_drawings')
    .insert({
      scene_id: sceneId,
      layer: normalizeLayer(layer),
      points: simplified,
      color: color || null,
      width: Number(width) > 0 ? Number(width) : 3,
      text: note || null,
    })
    .select(DRAWING_COLUMNS)
    .single();
  if (error) throw error;
  return toDrawing(data);
}

// Moving a mark rewrites its points and nothing else: it stays the same row, so
// everyone watching sees the same stroke move rather than one disappearing and
// another taking its place.
export async function moveDrawing(drawingId, points) {
  if (!drawingId) return null;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_drawings')
    .update({ points: normalizePoints(points) })
    .eq('id', drawingId)
    .select(DRAWING_COLUMNS)
    .single();
  if (error) throw error;
  return toDrawing(data);
}

export async function deleteDrawing(drawingId) {
  const supabase = requireClient();
  const { error } = await supabase.from('map_drawings').delete().eq('id', drawingId);
  if (error) throw error;
}

export async function clearDrawings(sceneId) {
  const supabase = requireClient();
  const { error } = await supabase.from('map_drawings').delete().eq('scene_id', sceneId);
  if (error) throw error;
}

// GM-only labels live in their own table because RLS filters rows, not columns:
// a secret kept on the token row would be delivered to the player and merely
// hidden by the client. A player calling this gets nothing back, by policy.
export async function listTokenSecrets(sceneId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_token_secrets')
    .select('token_id, label, map_tokens!inner(scene_id)')
    .eq('map_tokens.scene_id', sceneId);
  // A player is not refused, they simply see no rows; a real failure still
  // throws rather than silently reading as "no secrets".
  if (error) throw error;
  return Object.fromEntries((data || []).map((row) => [row.token_id, row.label || '']));
}

export async function setTokenSecret(tokenId, label) {
  const supabase = requireClient();
  const text = String(label || '').trim();
  if (!text) {
    const { error } = await supabase.from('map_token_secrets').delete().eq('token_id', tokenId);
    if (error) throw error;
    return '';
  }
  const { error } = await supabase
    .from('map_token_secrets')
    .upsert({ token_id: tokenId, label: text, updated_at: new Date().toISOString() }, { onConflict: 'token_id' });
  if (error) throw error;
  return text;
}

export async function uploadMapImage(campaignId, sceneId, file) {
  const supabase = requireClient();
  const path = mapImagePath(campaignId, sceneId, file?.name);
  if (!path) throw new Error('Missing campaign or scene for this map image.');

  const { error } = await supabase.storage
    .from(MAP_BUCKET)
    // A path is never reused — every upload mints a new one — so the bytes at a
    // given address never change and can be cached for as long as the browser
    // likes.
    .upload(path, file, { cacheControl: '2592000', upsert: false });
  if (error) throw error;
  return path;
}

// The bucket is private, so the editor renders through a signed URL. Callers
// keep the path and never the URL — but the URL is remembered here, because the
// browser caches an image by its address: signing afresh on every mount produced
// a new address for the same bytes and downloaded a whole battlemap again on
// each reload.
function readCachedUrl(path) {
  try {
    const raw = localStorage.getItem(SIGNED_URL_KEY + path);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry?.url && entry.expiresAt - SIGNED_URL_MARGIN_MS > Date.now() ? entry.url : null;
  } catch {
    return null;
  }
}

function writeCachedUrl(path, url, expiresIn) {
  try {
    localStorage.setItem(SIGNED_URL_KEY + path, JSON.stringify({
      url,
      expiresAt: Date.now() + expiresIn * 1000,
    }));
  } catch {
    // A full or denied storage only costs the caching, not the picture.
  }
}

export async function signMapImage(path, expiresIn = SIGNED_URL_TTL) {
  if (!path) return null;
  const cached = readCachedUrl(path);
  if (cached) return cached;

  const supabase = requireClient();
  const { data, error } = await supabase.storage.from(MAP_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  const url = data?.signedUrl || null;
  if (url) writeCachedUrl(path, url, expiresIn);
  return url;
}

function forgetSignedMapUrl(path) {
  try {
    localStorage.removeItem(SIGNED_URL_KEY + path);
  } catch {}
}

export async function deleteMapImages(paths) {
  const unique = [...new Set((paths || []).filter(Boolean))];
  if (!unique.length) return;
  const supabase = requireClient();
  const bucket = supabase.storage.from(MAP_BUCKET);
  // Keep requests modest: Storage accepts arrays, but a scene can have many
  // handouts and no single oversized cleanup request should fail them all.
  for (let index = 0; index < unique.length; index += 100) {
    const batch = unique.slice(index, index + 100);
    const { error } = await bucket.remove(batch);
    if (error) throw error;
    batch.forEach(forgetSignedMapUrl);
  }
}

export async function deleteMapImage(path) {
  await deleteMapImages(path ? [path] : []);
}

export async function deleteSceneMapImages(campaignId, sceneId) {
  const folder = mapImageFolder(campaignId, sceneId);
  if (!folder) throw new Error('Missing campaign or scene for image cleanup.');

  const supabase = requireClient();
  const bucket = supabase.storage.from(MAP_BUCKET);
  const paths = [];
  const limit = 100;
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    const entries = data || [];
    // Files have an id/metadata; folders do not. Uploads made by this app are
    // direct children, so never recurse into an unexpected path.
    paths.push(...entries
      .filter((entry) => entry?.name && (entry.id || entry.metadata))
      .map((entry) => `${folder}/${entry.name}`));
    if (entries.length < limit) break;
    offset += entries.length;
  }
  await deleteMapImages(paths);
}
