import { requireClient } from '../supabaseClient.js';
import { loadCharacter as storeLoadCharacter, saveCharacter as storeSaveCharacter } from '../../character/profile/store.js';
import { applyVitalCommand } from '../../character/combat/vitalCommands.js';
import { publishCharacterRow } from '../sync/characterRows.js';

const TABLE = 'characters';

// Exported because a portrait's address begins with the owner's id, which is
// what the storage policies key on.
export async function currentUser() {
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

// Push the local sheet. The database preserves existing combat vitals; only an
// explicit health command can edit those on an existing character.
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
    .select('id, name, owner, owner_username, updated_at, row_revision, data')
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
    .select('updated_at, campaign_id, name')
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

// Explicit absolute edits only. Damage/healing must use commandCharacterVitals
// with a delta so concurrent edits are recalculated against the current row.
export async function patchCharacterData(charId, patch) {
  if (!charId || !patch) return;
  return commandCharacterVitals(charId, { type: 'patch', patch });
}

const healthQueues = new Map();

export function commandCharacterVitals(charId, command) {
  const operationId = crypto.randomUUID();
  // Preserve click order within this tab. Other tabs/devices are serialized by
  // the database revision check, not by clocks or encounter timestamps.
  const previous = healthQueues.get(charId) || Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    const [{ calcMaxHP }, { ensureSheetRuntimeAdapters }] = await Promise.all([
      import('../../../pages/charsheet/state/calculations.js'),
      import('../../../pages/charsheet/state/sheetRuntimeAdapters.js'),
    ]);
    let row;
    try { row = await getCloudCharacter(charId); }
    catch (error) {
      const local = error.code === 'PGRST116' ? storeLoadCharacter(charId) : null;
      if (!local) throw error;
      // The first command on a newly created local sheet can precede autosave.
      // Insert its starting state, then apply the intent once via the same RPC.
      await pushCharacterData(charId, local);
      row = await getCloudCharacter(charId);
    }
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (row.row_revision == null) throw new Error('Character health update requires the database migration.');
      await ensureSheetRuntimeAdapters(row.data);
      const patch = applyVitalCommand(row.data, command, Math.max(1, calcMaxHP(row.data)));
      const args = { p_id: charId, p_revision: row.row_revision, p_operation: operationId, p_patch: patch };
      let result;
      // Retry transport failures using the SAME id, including lost acknowledgements.
      for (let retry = 0; retry < 2; retry += 1) {
        try {
          result = await requireClient().rpc('commit_character_vitals', args);
          if (result.error) throw result.error;
          break;
        } catch (error) { if (retry === 1) throw error; }
      }
      row = result.data.row;
      if (result.data.applied) {
        publishCharacterRow(row);
        return row;
      }
    }
    throw new Error('Character health is being edited elsewhere. Please try again.');
  });
  healthQueues.set(charId, pending);
  const cleanup = () => { if (healthQueues.get(charId) === pending) healthQueues.delete(charId); };
  pending.then(cleanup, cleanup);
  return pending;
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

// Characters OWNED by the logged-in user only. The select RLS is intentionally
// broad (it also exposes campaign sheets so the Campaigns page works), so we must
// scope by owner here: "My sheets" must never leak sheets shared via a campaign.
export async function listMyCharacters() {
  const supabase = requireClient();
  const user = await currentUser();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, owner, owner_username, campaign_id, updated_at')
    .eq('owner', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Every character the caller may see. For a global GM (profiles.role='gm') RLS
// returns all rows; for anyone else it also returns campaign sheets — so only the
// GM Sheets page should call this, and only when the user is a global GM.
export async function listAllCharacters() {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, owner, owner_username, campaign_id, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
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
