import { requireClient } from '../supabaseClient.js';
import { normalizeConditions } from '../../character/combat/conditions.js';
import { normalizeEffects } from '../../character/combat/combatEffects.js';
import { isSecretPiece, normalizeLayer, toToken, toTokenPatch } from '../../vtt/scene/scene.js';
import { deleteMapImage } from './vttMapImages.js';

// The pieces on a scene (map_tokens) and their GM-only side (map_token_secrets:
// secret labels and the private hit points of pieces not linked to a fight).

const TOKEN_COLUMNS = 'id, scene_id, layer, hidden_from_players, x, y, w, h, z, character_id, label, color, image_path, image_url, icon_key, icon_stroke_width, rotation, hp_current, hp_max, conditions, effects, source_ref, show_hp, turn_order, turn_active, created_by, updated_at';

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

// Id and version of every piece the caller may see, in listTokens order. RLS
// applies exactly as to listTokens, so a piece leaving the play area is simply
// missing here too.
export async function listTokenRevisions(sceneId) {
  const { data, error } = await requireClient()
    .from('map_tokens')
    .select('id, updated_at')
    .eq('scene_id', sceneId)
    .order('z', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, updatedAt: Date.parse(row.updated_at) || 0 }));
}

export async function listTokensByIds(sceneId, ids) {
  if (!ids?.length) return [];
  const { data, error } = await requireClient()
    .from('map_tokens')
    .select(TOKEN_COLUMNS)
    .eq('scene_id', sceneId)
    .in('id', ids);
  if (error) throw error;
  return (data || []).map(toToken).filter(Boolean);
}

// Real hit points never go on the public row: the database projects them there
// only while the bar is shown. A piece linked to a cloud fight takes them from
// its combatant; any other piece keeps them in the GM-only map_token_secrets.
export async function createToken(sceneId, token = {}) {
  const supabase = requireClient();
  const { hp_current: hpCurrent, hp_max: hpMax, ...publicPatch } = toTokenPatch({
    ...token,
    icon_key: token.iconKey ?? token.icon_key,
    icon_stroke_width: token.iconStrokeWidth ?? token.icon_stroke_width,
  });
  const row = {
    scene_id: sceneId,
    layer: normalizeLayer(token.layer),
    hidden_from_players: isSecretPiece(token),
    character_id: token.characterId || null,
    ...publicPatch,
  };
  const { data, error } = await supabase
    .from('map_tokens')
    .insert(row)
    .select(TOKEN_COLUMNS)
    .single();
  if (error) throw error;
  const created = toToken(data);
  const hasHp = hpCurrent != null || hpMax != null;
  if (!hasHp || row.character_id) return created;
  // Also for a linked piece: its cloud fight takes precedence, and without one
  // this is its source. The piece exists without HP until this lands; a
  // failure leaves it so, and the GM can set them from the token menu.
  await setTokenHp(created.id, { hpCurrent, hpMax }).catch(() => {});
  return { ...created, hpCurrent: hpCurrent ?? null, hpMax: hpMax ?? null };
}

// The GM-only hit points of pieces in a scene that are not linked to a fight.
export async function listTokenSecretHp(sceneId) {
  const { data, error } = await requireClient()
    .from('map_token_secrets')
    .select('token_id, hp_current, hp_max, hp_temp, hp_max_bonus, map_tokens!inner(scene_id)')
    .eq('map_tokens.scene_id', sceneId);
  if (error) throw error;
  return Object.fromEntries((data || []).map((row) => [
    row.token_id, secretVitals(row),
  ]));
}

// A standalone piece's private hit points, as the map reads them.
export function secretVitals(row) {
  return {
    hpCurrent: row.hp_current ?? null,
    hpMax: row.hp_max ?? null,
    tempHp: row.hp_temp ?? 0,
    maxHpBonus: row.hp_max_bonus ?? 0,
  };
}

// The one write for a standalone piece's hit points. RLS keeps it to the GM.
// Temporary ones and the maximum's bonus (21_token_hp_modifiers.sql) are
// written only when given, so an edit of the hit points alone keeps them.
export async function setTokenHp(tokenId, { hpCurrent = null, hpMax = null, ...rest } = {}) {
  const round = (value) => (value == null || value === '' || !Number.isFinite(Number(value))
    ? null : Math.round(Number(value)));
  const row = { token_id: tokenId, hp_current: round(hpCurrent), hp_max: round(hpMax) };
  if (Object.hasOwn(rest, 'tempHp')) row.hp_temp = Math.max(0, round(rest.tempHp) ?? 0);
  if (Object.hasOwn(rest, 'maxHpBonus')) row.hp_max_bonus = round(rest.maxHpBonus) ?? 0;
  const { error } = await requireClient()
    .from('map_token_secrets')
    .upsert(row, { onConflict: 'token_id' });
  if (error) throw error;
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
    p_effects: normalizeEffects(effects),
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
    // Clear the label only: the same row holds the piece's private hit points.
    const { error } = await supabase.from('map_token_secrets').update({ label: null }).eq('token_id', tokenId);
    if (error) throw error;
    return '';
  }
  const { error } = await supabase
    .from('map_token_secrets')
    .upsert({ token_id: tokenId, label: text, updated_at: new Date().toISOString() }, { onConflict: 'token_id' });
  if (error) throw error;
  return text;
}
