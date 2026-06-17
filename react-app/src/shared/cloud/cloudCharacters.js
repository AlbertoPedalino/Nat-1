import { requireClient } from './supabaseClient.js';
import { loadCharacter as storeLoadCharacter, saveCharacter as storeSaveCharacter } from '../character/store.js';

const TABLE = 'characters';

async function currentUser() {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data?.user;
  if (!user) throw new Error('Not signed in.');
  return user;
}

async function getCloudOwner(supabase, charId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('owner')
    .eq('id', charId)
    .maybeSingle();
  if (error) throw error;
  return data?.owner || null;
}

// Push the LOCAL copy of a character to the cloud (insert or overwrite).
// We mirror exactly what store.js holds so a pull round-trips perfectly.
export async function pushCharacter(charId) {
  const supabase = requireClient();
  const user = await currentUser();
  const local = storeLoadCharacter(charId);
  if (!local) throw new Error('Character not found locally.');

  const owner = await getCloudOwner(supabase, charId);
  if (owner && owner !== user.id) {
    return updateForeignCharacter(charId);
  }

  const username = user.user_metadata?.username || null;
  const row = {
    id: charId,
    owner: user.id,
    owner_username: username,
    name: local.name || 'Character',
    data: local,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' });
  if (error) throw error;
  return row;
}

// Read a cloud character WITHOUT touching local storage (for read-only viewing).
export async function getCloudCharacter(charId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('name, owner_username, data')
    .eq('id', charId)
    .single();
  if (error) throw error;
  return data;
}

// Lightweight existence/freshness check: returns { updated_at } or null.
export async function fetchCloudMeta(charId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('updated_at')
    .eq('id', charId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// Update someone else's cloud sheet (as a GM): writes data/name only, leaving
// `owner` and `campaign_id` untouched so RLS and ownership stay intact.
export async function updateForeignCharacter(charId) {
  const supabase = requireClient();
  const local = storeLoadCharacter(charId);
  if (!local) throw new Error('Character not found locally.');
  const { data, error } = await supabase
    .from(TABLE)
    .update({ name: local.name || 'Character', data: local, updated_at: new Date().toISOString() })
    .eq('id', charId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('No permission to update this character.');
  return data;
}

// Direct cloud edit path used when local storage persistence is disabled.
// Updates only the sheet payload/name, preserving owner and campaign links.
export async function updateCloudCharacterData(charId, character) {
  if (!charId || !character) throw new Error('Character data missing.');
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ name: character.name || 'Character', data: character, updated_at: new Date().toISOString() })
    .eq('id', charId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('No permission to update this character.');
  return data;
}

// Upsert a character to the cloud straight from an in-memory object — no local
// store dependency. The builder's cloud-only autosave never writes localStorage,
// so there's nothing for pushCharacter() (which reads the store) to read.
export async function pushCharacterData(charId, character) {
  if (!charId || !character) throw new Error('Character data missing.');
  const supabase = requireClient();
  const user = await currentUser();
  const owner = await getCloudOwner(supabase, charId);
  if (owner && owner !== user.id) {
    // Not our row (e.g. a GM building on a player's id): data/name only.
    return updateCloudCharacterData(charId, character);
  }
  const username = user.user_metadata?.username || null;
  const row = {
    id: charId,
    owner: user.id,
    owner_username: username,
    name: character.name || 'Character',
    data: character,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' });
  if (error) throw error;
  return row;
}

// Pull a cloud character back into local storage (so existing screens can open it).
export async function pullCharacter(charId) {
  const supabase = requireClient();
  const { data, error } = await supabase.from(TABLE).select('data').eq('id', charId).single();
  if (error) throw error;
  if (!data?.data) throw new Error('No cloud data for this character.');
  storeSaveCharacter(charId, data.data);
  return data.data;
}

// Characters owned by the logged-in player (RLS already scopes the query).
export async function listMyCharacters() {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, owner, owner_username, campaign_id, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Every character — only returns rows for a GM (RLS enforces it server-side).
export async function listAllCharacters() {
  return listMyCharacters();
}

// GM (or owner) delete: RLS allows owner OR gm to remove any matching row.
export async function deleteCloudCharacter(charId) {
  const supabase = requireClient();
  const { error } = await supabase.from(TABLE).delete().eq('id', charId);
  if (error) throw error;
}

// Owner-only delete: the extra owner filter guarantees this never touches another
// user's row, even if the caller happens to be a GM.
export async function deleteOwnCloudCharacter(charId) {
  const supabase = requireClient();
  const user = await currentUser();
  const { error } = await supabase.from(TABLE).delete().eq('id', charId).eq('owner', user.id);
  if (error) throw error;
}
