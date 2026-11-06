import { requireClient } from '../supabaseClient.js';
import {
  isDrawable,
  normalizePoints,
  sanitizeNoteText,
  simplifyStroke,
  toDrawing,
} from '../../vtt/map/drawing.js';
import { normalizeArea } from '../../vtt/map/areas.js';
import { normalizeLayer } from '../../vtt/scene/scene.js';

const DRAWING_COLUMNS = 'id, scene_id, layer, points, color, width, text, area, hidden_from_players, created_by, created_at, updated_at';

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

// Id and version of every mark the caller may see, in listDrawings order, for
// the recovery poll: a new, erased or edited mark shows up here. RLS applies as
// to listDrawings, so a mark the GM hid is simply missing.
export async function listDrawingRevisions(sceneId) {
  const { data, error } = await requireClient()
    .from('map_drawings')
    .select('id, updated_at')
    .eq('scene_id', sceneId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, updatedAt: Date.parse(row.updated_at) || 0 }));
}

export async function listDrawingsByIds(sceneId, ids) {
  if (!ids?.length) return [];
  const { data, error } = await requireClient()
    .from('map_drawings')
    .select(DRAWING_COLUMNS)
    .eq('scene_id', sceneId)
    .in('id', ids);
  if (error) throw error;
  return (data || []).map(toDrawing).filter(Boolean);
}

export async function createDrawing(sceneId, { points, color, width, layer, text, area } = {}) {
  const supabase = requireClient();
  const note = sanitizeNoteText(text);
  const shape = normalizeArea(area);
  // An area is exactly its origin and tip, and its text is an optional label.
  // A note is anchored by a single point and needs no simplification; a stroke
  // is worth storing only if it went somewhere.
  const simplified = shape
    ? normalizePoints(points).slice(0, 2)
    : note ? normalizePoints(points).slice(0, 1) : simplifyStroke(points);
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
      area: shape,
    })
    .select(DRAWING_COLUMNS)
    .single();
  if (error) throw error;
  return toDrawing(data);
}

// What a drawing's menu changes: shape and place (points), colour, width,
// text (a note's words or an area's label; empty removes a label), the area's
// description, and whether the players see it. Only the fields given are
// written, so a colour change cannot replay a stale label.
export async function updateDrawing(drawingId, patch = {}) {
  if (!drawingId) return null;
  const row = {};
  if (Object.hasOwn(patch, 'points')) row.points = normalizePoints(patch.points);
  if (Object.hasOwn(patch, 'color')) row.color = patch.color || null;
  if (Object.hasOwn(patch, 'width') && Number(patch.width) > 0) row.width = Number(patch.width);
  if (Object.hasOwn(patch, 'text')) row.text = sanitizeNoteText(patch.text) || null;
  if (Object.hasOwn(patch, 'area')) row.area = normalizeArea(patch.area);
  if (Object.hasOwn(patch, 'hiddenFromPlayers')) row.hidden_from_players = Boolean(patch.hiddenFromPlayers);
  if (!Object.keys(row).length) return null;
  const { data, error } = await requireClient()
    .from('map_drawings')
    .update(row)
    .eq('id', drawingId)
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

