import { requireClient } from './supabaseClient.js';
import { toHexCell, toHexCellPatch } from '../hexcrawl/hexCell.js';
import { STORAGE_KEYS, sanitizeBoardId, scopeKey } from '../../pages/gmboard/storage.js';
import { createDefaultCoreState } from '../../pages/gmboard/logic/defaultState.js';
import { createDefaultTables } from '../../pages/gmboard/logic/defaultTables.js';

// Cloud side of the hexcrawl. Three stores, split by how often each is written
// (see supabase/hexcrawl.sql): the clock is one row per campaign, the log is
// append-only, and every hex is its own row so a click is an upsert and not a
// read-modify-write of the whole map.
//
// The board's own blob (`boards.data`) is NOT touched here. It holds the d20
// tables, one writer pushes it, and mixing the fast-moving clock into it is
// exactly the contention this split exists to avoid.

const CLOCK_COLUMNS = 'campaign_id, min, day, month, year, season, meteo, intensity, '
  + 'hours_since_weather, next_weather_in, party_q, party_r, scene_id, updated_at';
const CELL_COLUMNS = 'scene_id, q, r, terrain, tier, pop, status, note, revealed, updated_at';

function toClock(row) {
  if (!row?.campaign_id) return null;
  return {
    campaignId: row.campaign_id,
    min: Number(row.min) || 0,
    day: Number(row.day) || 1,
    month: Number(row.month) || 1,
    year: Number(row.year) || 1,
    season: row.season || null,
    meteo: row.meteo || 'Clear',
    intensity: row.intensity || '',
    hoursSinceWeather: Number(row.hours_since_weather) || 0,
    nextWeatherIn: Number(row.next_weather_in) || 0,
    party: row.party_q == null || row.party_r == null
      ? null
      : { q: Number(row.party_q), r: Number(row.party_r) },
    sceneId: row.scene_id || null,
    updatedAt: Date.parse(row.updated_at) || 0,
  };
}

function clockRow(campaignId, clock) {
  const row = { campaign_id: campaignId };
  const map = {
    min: 'min',
    day: 'day',
    month: 'month',
    year: 'year',
    season: 'season',
    meteo: 'meteo',
    intensity: 'intensity',
    hoursSinceWeather: 'hours_since_weather',
    nextWeatherIn: 'next_weather_in',
    sceneId: 'scene_id',
  };
  for (const [key, column] of Object.entries(map)) {
    if (clock?.[key] !== undefined) row[column] = clock[key];
  }
  if (clock?.party !== undefined) {
    row.party_q = clock.party ? Math.round(clock.party.q) : null;
    row.party_r = clock.party ? Math.round(clock.party.r) : null;
  }
  return row;
}

export async function readCampaignClock(campaignId) {
  if (!campaignId) return null;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('campaign_hexcrawl')
    .select(CLOCK_COLUMNS)
    .eq('campaign_id', campaignId)
    .maybeSingle();
  if (error) throw error;
  return toClock(data);
}

// Upsert rather than update: the first hex a campaign ever enters is also the
// moment its clock starts existing, and asking the GM to create one first would
// be a step that exists only because of the schema.
export async function saveCampaignClock(campaignId, clock) {
  if (!campaignId) throw new Error('This board is not linked to a campaign.');
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('campaign_hexcrawl')
    .upsert(clockRow(campaignId, clock), { onConflict: 'campaign_id' })
    .select(CLOCK_COLUMNS)
    .single();
  if (error) throw error;
  return toClock(data);
}

export async function appendCampaignLog(campaignId, entry) {
  const text = String(entry ?? '').trim();
  if (!campaignId || !text) return null;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('campaign_hexcrawl_log')
    .insert({ campaign_id: campaignId, entry: text.slice(0, 2000) })
    .select('id, entry, created_at')
    .single();
  if (error) throw error;
  return { id: data.id, entry: data.entry, createdAt: Date.parse(data.created_at) || 0 };
}

export async function listCampaignLog(campaignId, limit = 50) {
  if (!campaignId) return [];
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('campaign_hexcrawl_log')
    .select('id, entry, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    entry: row.entry,
    createdAt: Date.parse(row.created_at) || 0,
  }));
}

export async function listHexCells(sceneId) {
  if (!sceneId) return [];
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('map_hex_cells')
    .select(CELL_COLUMNS)
    .eq('scene_id', sceneId);
  if (error) throw error;
  return (data || []).map(toHexCell).filter(Boolean);
}

export async function saveHexCell(sceneId, cell, patch) {
  if (!sceneId) throw new Error('This hex has no scene.');
  const supabase = requireClient();
  const row = {
    scene_id: sceneId,
    q: Math.round(Number(cell?.q) || 0),
    r: Math.round(Number(cell?.r) || 0),
    ...toHexCellPatch(patch),
  };
  const { data, error } = await supabase
    .from('map_hex_cells')
    .upsert(row, { onConflict: 'scene_id,q,r' })
    .select(CELL_COLUMNS)
    .single();
  if (error) throw error;
  return toHexCell(data);
}

// Which board a campaign takes its tables from. One per campaign, enforced by
// the column itself.
export async function setCampaignHexcrawlBoard(campaignId, boardId) {
  if (!campaignId) throw new Error('No campaign to link.');
  const supabase = requireClient();
  const { error } = await supabase
    .from('campaigns')
    .update({ hexcrawl_board_id: boardId || null })
    .eq('id', campaignId);
  if (error) throw error;
  return boardId || null;
}

export async function readCampaignHexcrawlBoard(campaignId) {
  if (!campaignId) return null;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('hexcrawl_board_id')
    .eq('id', campaignId)
    .maybeSingle();
  if (error) throw error;
  return data?.hexcrawl_board_id || null;
}

// The board a campaign takes its tables from, read straight rather than pulled:
// `pullInstance` restores the blob into this browser's localStorage and makes it
// the active board, which is right for "open my board here" and wrong for "the
// map needs the tables". Reading is all the map does.
export async function readHexcrawlBoard(boardId) {
  const id = sanitizeBoardId(boardId);
  if (!id) return null;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('boards')
    .select('id, name, data, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.data) return null;

  const parse = (key, fallback) => {
    const raw = data.data[scopeKey(id, key)];
    if (typeof raw !== 'string') return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  };
  return {
    id: data.id,
    name: data.name || id,
    state: parse(STORAGE_KEYS.state, createDefaultCoreState()),
    tables: parse(STORAGE_KEYS.tables, createDefaultTables()),
    updatedAt: Date.parse(data.updated_at) || 0,
  };
}

export async function readHexcrawlBoardVersion(boardId) {
  const id = sanitizeBoardId(boardId);
  if (!id) return 0;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('boards')
    .select('updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return Date.parse(data?.updated_at) || 0;
}

// Realtime, same shape as the scene channels: the GM's map and the GM's board
// are two browsers as often as they are two tabs.
export function subscribeHexcrawl({ campaignId, sceneId, onClock, onCell }) {
  const supabase = requireClient();
  const channel = supabase.channel(`hexcrawl:${campaignId || 'none'}:${sceneId || 'none'}`);

  if (campaignId && onClock) {
    channel.on(
      'postgres_changes',
      {
        event: '*', schema: 'public', table: 'campaign_hexcrawl', filter: `campaign_id=eq.${campaignId}`,
      },
      (payload) => onClock(toClock(payload.new) || toClock(payload.old)),
    );
  }

  if (sceneId && onCell) {
    channel.on(
      'postgres_changes',
      {
        event: '*', schema: 'public', table: 'map_hex_cells', filter: `scene_id=eq.${sceneId}`,
      },
      (payload) => onCell({
        cell: toHexCell(payload.new) || toHexCell(payload.old),
        removed: payload.eventType === 'DELETE',
      }),
    );
  }

  channel.subscribe();
  return () => { try { supabase.removeChannel(channel); } catch (_) {} };
}
