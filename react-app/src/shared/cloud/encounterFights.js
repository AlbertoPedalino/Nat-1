import { requireClient, supabase } from './supabaseClient.js';
import {
  FIGHT_COLUMNS,
  toFightEntry,
  toFightRow,
} from '../../pages/encounterbuilder/logic/fightRecord.js';

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

export async function deleteInstanceFight(fightId) {
  if (!fightId) return;
  const client = requireClient();
  const { error } = await client.from('encounter_fights').delete().eq('id', String(fightId));
  if (error) throw error;
}

// Every change to this instance's fights, from anywhere. The caller re-reads
// rather than trusting the payload: a row arriving out of order is a wrong
// answer, and the list is small enough that asking again is cheap.
export function subscribeInstanceFights(instanceId, onChange) {
  if (!instanceId || !supabase) return () => {};
  let channel;
  try {
    channel = supabase.channel(`gb-encounter-fights-${String(instanceId).replace(/[^a-z0-9_-]/gi, '_').slice(0, 60)}`);
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'encounter_fights',
      filter: `instance_id=eq.${instanceId}`,
    }, () => {
      try {
        onChange();
      } catch (_) {
        // Realtime is opportunistic: a listener that throws must not take the
        // socket down with it.
      }
    });
    channel.subscribe();
  } catch (_) {
    return () => {};
  }
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {
      // Cleanup stays fail-soft if the socket was already closed.
    }
  };
}
