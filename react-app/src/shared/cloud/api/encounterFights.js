import { requireClient, supabase } from '../supabaseClient.js';
import {
  FIGHT_COLUMNS,
  toFightEntry,
  toFightRow,
} from '../../../pages/encounterbuilder/library/fightRecord.js';

// Fights, as rows.
//
// The encounter builder keeps its party and its library as one blob per
// instance, pushed on a timer. That is fine for what only it edits. A fight is
// not that: the battle map writes one when a dungeon room is handed over, and
// reads it for every piece it drops. Two writers on one blob means the later
// push replaces the earlier one whole — which is exactly how a room sent from
// the map was quietly deleted by a builder tab that had been open the while.
//
// So a fight is a row. Saving one touches that fight and nothing else, and the
// realtime feed says so to every screen with this instance open.

export async function listInstanceFights(instanceId) {
  if (!instanceId) return [];
  const client = requireClient();
  const { data, error } = await client
    .from('encounter_fights')
    .select(FIGHT_COLUMNS)
    .eq('instance_id', instanceId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toFightEntry).filter(Boolean);
}

// Upsert rather than insert-or-update by hand: the map creates a fight the
// builder has never seen, and the builder saves one the map created. Both are
// the same statement.
export async function saveInstanceFight(instanceId, entry) {
  const client = requireClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth?.user) throw new Error('Not signed in.');

  const row = toFightRow(instanceId, auth.user.id, entry);
  if (!row) return null;
  const { error } = await client.from('encounter_fights').upsert(row, { onConflict: 'id' });
  if (error) throw error;
  return row;
}

export async function getInstanceFight(fightId) {
  if (!fightId) return null;
  const { data, error } = await requireClient()
    .from('encounter_fights')
    .select(FIGHT_COLUMNS)
    .eq('id', String(fightId))
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// The fights behind the linked pieces of a scene, for the GM's view of their
// real hit points (RLS: only the owner reads them).
export async function listFightVitals(fightIds) {
  const ids = [...new Set((fightIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  const { data, error } = await requireClient()
    .from('encounter_fights')
    .select('id, instance_id, fight, updated_at')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

// Versions only, so the battle map's recovery poll fetches a fight's JSON just
// when it changed.
export async function listFightRevisions(fightIds) {
  const ids = [...new Set((fightIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  const { data, error } = await requireClient()
    .from('encounter_fights')
    .select('id, updated_at')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

export const FIGHT_VITALS_TIMEOUT_MS = 8_000;
export const FIGHT_UNAVAILABLE = 'FIGHT_UNAVAILABLE';
export const FIGHT_TIMEOUT = 'FIGHT_TIMEOUT';

// The one write for an enemy's vitals: this combatant, inside its fight row.
// `base` holds the values the patch was computed from; the database applies
// nothing if they no longer match and returns the current row instead.
// Resolves to { applied, row }. FIGHT_UNAVAILABLE means there is no cloud row
// for this combatant (or the migration is missing): the caller keeps its local
// behaviour. Nothing here retries.
export async function commitFightCombatantVitals(fightId, combatantId, { base = null, patch }, {
  timeoutMs = FIGHT_VITALS_TIMEOUT_MS,
} = {}) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error('Enemy health update timed out.'), { code: FIGHT_TIMEOUT }));
    }, timeoutMs);
  });
  const request = Promise.resolve(requireClient().rpc('commit_fight_combatant_vitals', {
    p_fight_id: String(fightId),
    p_combatant_id: String(combatantId),
    p_base: base,
    p_patch: patch,
  })).then(({ data, error }) => {
    if (error) {
      if (error.code === 'P0002' || error.code === 'PGRST202') {
        throw Object.assign(new Error(error.message || 'Fight unavailable.'), { code: FIGHT_UNAVAILABLE });
      }
      throw error;
    }
    return { applied: Boolean(data?.applied), row: data?.row || null };
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function deleteInstanceFight(fightId) {
  if (!fightId) return;
  const client = requireClient();
  const { error } = await client.from('encounter_fights').delete().eq('id', String(fightId));
  if (error) throw error;
}

// Every change to this instance's fights, from anywhere. The listener gets the
// realtime payload so a complete row can be applied as it is; it decides when
// a re-read is still needed. `onStatus` hears SUBSCRIBED, which after a
// reconnect is the moment to recover what was missed.
export function subscribeInstanceFights(instanceId, onChange, { onStatus } = {}) {
  if (!instanceId || !supabase) return () => {};
  let channel;
  const remove = () => {
    try {
      if (channel) supabase.removeChannel(channel);
    } catch (_) {
      // Cleanup stays fail-soft if the socket was already closed.
    }
  };
  try {
    channel = supabase.channel(`gb-encounter-fights-${String(instanceId).replace(/[^a-z0-9_-]/gi, '_').slice(0, 60)}`);
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'encounter_fights',
      filter: `instance_id=eq.${instanceId}`,
    }, (payload) => {
      try {
        onChange(payload);
      } catch (_) {
        // Realtime is opportunistic: a listener that throws must not take the
        // socket down with it.
      }
    });
    channel.subscribe((status) => {
      try { onStatus?.(status); } catch (_) {}
    });
  } catch (_) {
    // A channel that failed half-way through setup must not linger.
    remove();
    return () => {};
  }
  return remove;
}
