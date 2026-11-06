import { requireClient } from '../supabaseClient.js';
import {
  getCharacterSyncMeta, loadCharacter as storeLoadCharacter, markCharacterSynced, saveCharacter as storeSaveCharacter,
} from '../../character/profile/store.js';
import { stripRuntimeOnlyCharacterFields } from '../../character/profile/runtimeFields.js';
import { publishCharacterSheetSaved } from '../sync/characterEvents.js';
import { tagSync } from '../sync/syncDiagnostics.js';
import { currentUser } from '../cloudCall.js';

const TABLE = 'characters';

// What `characters.data` may hold: never the runtime-only fields an open sheet
// attaches (runtimeFields.js). Every write of `data` goes through here.
function sheetData(character) {
  return stripRuntimeOnlyCharacterFields(character);
}

// Exported because a portrait's address begins with the owner's id, which is
// what the storage policies key on.

async function getCloudOwner(supabase, charId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('owner')
    .eq('id', charId)
    .maybeSingle();
  if (error) throw error;
  return data?.owner || null;
}

// Whose folder a character's portrait goes in: the owner's, even when the GM is
// the one uploading. Null for a character that has not reached the cloud yet.
export async function getCharacterOwner(charId) {
  return getCloudOwner(requireClient(), charId);
}

// A whole-sheet save lost the race: the sheet moved past the revision the
// save was based on (someone else saved in between). Nothing was written.
export const SHEET_CONFLICT = 'SHEET_CONFLICT';

function sheetConflict(charId, remoteSheetRevision) {
  return Object.assign(
    new Error('This sheet was changed elsewhere. Nothing was overwritten.'),
    { code: SHEET_CONFLICT, characterId: String(charId), remoteSheetRevision },
  );
}

// Update name/data of an existing row and answer with the sheet revision it
// produced — only if the sheet is still at `expectedSheetRevision`
// (`… and sheet_revision = expected`). The one rule for every whole-sheet
// write: a copy that knows no revision (a local copy from before revisions
// existed, a builder that never loaded the row) is not allowed to overwrite
// the cloud — nothing is written, one light read of the revision tells the
// caller what the cloud holds, and it is a SHEET_CONFLICT the user resolves.
// A refused update is told apart from a missing permission the same way.
async function updateSheet(charId, fields, expectedSheetRevision = null) {
  if (expectedSheetRevision == null) {
    const current = await getCloudSheetRevision(charId);
    if (current != null) throw sheetConflict(charId, current);
    throw new Error('Character unavailable or no permission.');
  }
  const { data, error } = await requireClient()
    .from(TABLE)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', charId)
    .eq('sheet_revision', expectedSheetRevision)
    .select('id, sheet_revision')
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return Number(data.sheet_revision);
  const current = await getCloudSheetRevision(charId);
  if (current != null && current !== Number(expectedSheetRevision)) throw sheetConflict(charId, current);
  throw new Error('No permission to update this character.');
}

// Every whole-sheet save of this tab announces the revision it produced.
function saved(charId, sheetRevision) {
  publishCharacterSheetSaved(charId, sheetRevision);
  return { id: String(charId), sheetRevision };
}

// Push the local sheet. The database preserves existing combat vitals; only an
// explicit health command can edit those on an existing character. An existing
// row is updated only if it is still at the revision this local copy was last
// aligned with, so a stale copy never overwrites a change made elsewhere; a
// local copy with no known revision is refused (SHEET_CONFLICT) until the user
// chooses a version. A missing row is created.
export async function pushCharacter(charId) {
  const supabase = requireClient();
  const user = await currentUser(requireClient());
  const local = storeLoadCharacter(charId);
  if (!local) throw new Error('Character not found locally.');
  const { sheetRevision: expected, editVersion } = getCharacterSyncMeta(charId);

  const owner = await getCloudOwner(supabase, charId);
  if (owner && owner !== user.id) {
    return updateForeignCharacter(charId);
  }

  const username = user.user_metadata?.username || null;
  let sheetRevision;
  if (owner) {
    sheetRevision = await updateSheet(charId, {
      owner_username: username, name: local.name || 'Character', data: sheetData(local),
    }, expected);
  } else {
    const row = {
      id: charId,
      owner: user.id,
      owner_username: username,
      name: local.name || 'Character',
      data: sheetData(local),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from(TABLE).insert(row).select('sheet_revision').maybeSingle();
    // Created elsewhere in between (unique violation): not ours to overwrite.
    if (error?.code === '23505') throw sheetConflict(charId, await getCloudSheetRevision(charId));
    if (error) throw error;
    sheetRevision = Number(data?.sheet_revision ?? 0);
  }
  markCharacterSynced(charId, sheetRevision, editVersion);
  return saved(charId, sheetRevision);
}

// Read a cloud character WITHOUT touching local storage. `reason` only tags
// the request for the traffic diagnostics (syncDiagnostics.js).
export async function getCloudCharacter(charId, { reason = 'load' } = {}) {
  const supabase = requireClient();
  tagSync(`characters full ${reason}`);
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, owner, owner_username, updated_at, row_revision, sheet_revision, data')
    .eq('id', charId)
    .single();
  if (error) throw error;
  return data;
}

// The sheet's content revision only (a few bytes): whether a held sheet is
// still current. Null when the row is gone or unreadable.
export async function getCloudSheetRevision(charId) {
  const supabase = requireClient();
  tagSync('characters sheet_revision check');
  const { data, error } = await supabase
    .from(TABLE)
    .select('sheet_revision')
    .eq('id', charId)
    .maybeSingle();
  if (error) throw error;
  return data?.sheet_revision == null ? null : Number(data.sheet_revision);
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

// Update someone else's cloud sheet (as a GM) from its local copy: writes
// data/name only, leaving `owner` and `campaign_id` untouched so RLS and
// ownership stay intact. Conditional on the revision the local copy is based on.
export async function updateForeignCharacter(charId) {
  const local = storeLoadCharacter(charId);
  if (!local) throw new Error('Character not found locally.');
  const { sheetRevision: expected, editVersion } = getCharacterSyncMeta(charId);
  const sheetRevision = await updateSheet(charId, { name: local.name || 'Character', data: sheetData(local) }, expected);
  markCharacterSynced(charId, sheetRevision, editVersion);
  return saved(charId, sheetRevision);
}

// Direct cloud edit path used when local storage persistence is disabled.
// Updates only the sheet payload/name, preserving owner and campaign links.
// With `expectedSheetRevision` (an open sheet always passes it), the save
// fails with SHEET_CONFLICT instead of overwriting a newer sheet.
export async function updateCloudCharacterData(charId, character, { expectedSheetRevision = null } = {}) {
  if (!charId || !character) throw new Error('Character data missing.');
  const sheetRevision = await updateSheet(
    charId, { name: character.name || 'Character', data: sheetData(character) }, expectedSheetRevision,
  );
  return saved(charId, sheetRevision);
}

// Save a character to the cloud straight from an in-memory object — no local
// store dependency (the builder's cloud-only autosave never writes
// localStorage, so there's nothing for pushCharacter() to read).
//
// A character that does not exist yet is created (INSERT; its first
// sheet_revision comes back). An existing one is only ever updated conditionally
// on `expectedSheetRevision`, the revision the caller's copy is based on: a
// caller that never saw the row has none, and gets SHEET_CONFLICT instead of
// overwriting it blind. A GM saving a player's row writes data/name only.
export async function pushCharacterData(charId, character, { expectedSheetRevision = null } = {}) {
  if (!charId || !character) throw new Error('Character data missing.');
  const supabase = requireClient();
  const user = await currentUser(requireClient());
  const owner = await getCloudOwner(supabase, charId);
  const username = user.user_metadata?.username || null;
  if (owner) {
    const fields = owner === user.id
      ? { owner_username: username, name: character.name || 'Character', data: sheetData(character) }
      : { name: character.name || 'Character', data: sheetData(character) };
    return saved(charId, await updateSheet(charId, fields, expectedSheetRevision));
  }
  const row = {
    id: charId,
    owner: user.id,
    owner_username: username,
    name: character.name || 'Character',
    data: sheetData(character),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select('sheet_revision').maybeSingle();
  // Created by someone else in between (unique violation): not ours to overwrite.
  if (error?.code === '23505') throw sheetConflict(charId, await getCloudSheetRevision(charId));
  if (error) throw error;
  return saved(charId, Number(data?.sheet_revision ?? 0));
}

// Pull a cloud character back into local storage (so existing screens can open it).
export async function pullCharacter(charId) {
  const supabase = requireClient();
  tagSync('characters full pull');
  const { data, error } = await supabase.from(TABLE).select('data, sheet_revision').eq('id', charId).single();
  if (error) throw error;
  if (!data?.data) throw new Error('No cloud data for this character.');
  // An older row may still carry runtime-only fields: never copy them locally.
  // The copy is the cloud's, not a local edit: no push, and it is aligned with
  // that revision.
  const stored = sheetData(data.data);
  storeSaveCharacter(charId, stored, { emit: false });
  markCharacterSynced(charId, data.sheet_revision ?? null);
  return stored;
}

// Characters OWNED by the logged-in user only. The select RLS is intentionally
// broad (it also exposes campaign sheets so the Campaigns page works), so we must
// scope by owner here: "My sheets" must never leak sheets shared via a campaign.
export async function listMyCharacters() {
  const supabase = requireClient();
  const user = await currentUser(requireClient());
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
  const user = await currentUser(requireClient());
  const { error } = await supabase.from(TABLE).delete().eq('id', charId).eq('owner', user.id);
  if (error) throw error;
}
