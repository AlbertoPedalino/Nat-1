import { requireClient } from '../supabaseClient.js';
import { loadCharacter as storeLoadCharacter, saveCharacter as storeSaveCharacter } from '../../character/profile/store.js';
import { applyVitalCommand } from '../../character/combat/vitalCommands.js';
import { pickCharacterVitals } from '../../character/combat/vitals.js';
import { readBaseMaxHp } from '../../campaign/characterVitals.js';
import { publishCharacterVitals, requestCharacterRecheck } from '../sync/characterEvents.js';
import { listCharacterDigests } from './characterDigests.js';
import { healthCommandRoute } from './healthCommandRoute.js';

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

// The row's version only (a few bytes): whether a held sheet is still current.
// Null when the row is gone or unreadable.
export async function getCloudCharacterRevision(charId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('row_revision')
    .eq('id', charId)
    .maybeSingle();
  if (error) throw error;
  return data?.row_revision == null ? null : Number(data.row_revision);
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

export const HEALTH_COMMAND_TIMEOUT_MS = 8_000;
export const HEALTH_CONFLICT = 'HEALTH_CONFLICT';
export const HEALTH_TIMEOUT = 'HEALTH_TIMEOUT';

// Commands that add to what is there. When the database explicitly refused one
// (`applied: false`, so it certainly did not land), it is recomputed once from
// the state that answer carries: two players hitting the same character both
// count. Absolute commands (set HP, a patch, a token edit, a toggle decided on
// what the user saw) are never replayed over someone else's change.
const RELATIVE_COMMANDS = new Set(['modifyHp', 'modifyTempHp', 'grantTempHp', 'modifyMaxHp', 'deathSaveRoll']);

const healthQueues = new Map();
// The newest answer this tab received per character, so a command queued
// behind another starts from what that one committed, not from the digest the
// caller held when it was clicked.
const latestAnswers = new Map();
// How many commands took each path, for diagnostics and tests.
const routeCounts = { digest: 0, legacy: 0 };

export function healthCommandStats() {
  return { ...routeCounts };
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(`${label} timed out.`), { code: HEALTH_TIMEOUT }));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// The normal path: everything is already in hand. `digest` is the character
// digest the caller follows; `base` is `{ hpBasis, baseMax }` for that basis.
function stateFromDigest(charId, digest, base) {
  const state = {
    revision: Number(digest.rowRevision),
    hpBasis: digest.hpBasis,
    vitals: pickCharacterVitals(digest),
    baseMax: base.baseMax,
  };
  const answer = latestAnswers.get(String(charId));
  if (answer && answer.hpBasis === state.hpBasis && answer.digestRevision > state.revision) {
    return { ...state, revision: answer.digestRevision, vitals: answer.vitals };
  }
  return state;
}

async function readDigest(charId) {
  return (await listCharacterDigests({ characterIds: [charId] }))[0] || null;
}

// The rare path, for a caller that has no digest yet, no base max, or a base
// max of another basis: read the digest first, then the sheet (a sheet newer
// than that digest fails the commit's check instead of being trusted), and
// derive the base max here.
async function stateFromSheet(charId) {
  let digest = await readDigest(charId);
  if (!digest) {
    if ((await getCloudCharacterRevision(charId)) != null) {
      throw new Error('Character health update requires the database migration.');
    }
    // The first command on a newly created local sheet can precede autosave.
    // Insert its starting state, then apply the intent once via the same RPC.
    const local = storeLoadCharacter(charId);
    if (!local) throw new Error('Character unavailable or no permission.');
    await pushCharacterData(charId, local);
    digest = await readDigest(charId);
    if (!digest) throw new Error('Character health update requires the database migration.');
  }
  const row = await getCloudCharacter(charId);
  const baseMax = (await readBaseMaxHp([row])).get(String(row.id));
  if (!Number.isFinite(baseMax)) throw new Error('The maximum hit points of this character cannot be derived.');
  return {
    revision: digest.rowRevision,
    hpBasis: digest.hpBasis,
    vitals: { ...pickCharacterVitals(row.data), exhaustionLevel: row.data.exhaustionLevel },
    baseMax,
  };
}

function toAnswer(charId, data) {
  if (!data || typeof data.applied !== 'boolean' || !data.vitals || typeof data.vitals !== 'object') {
    throw new Error('Unexpected answer to a character health update.');
  }
  return {
    applied: data.applied,
    characterId: String(data.characterId ?? charId),
    vitals: data.vitals,
    digestRevision: data.digestRevision == null ? null : Number(data.digestRevision),
    hpBasis: typeof data.hpBasis === 'string' ? data.hpBasis : null,
  };
}

// One commit: an absolute patch against the digest it was computed from. The
// answer — applied or not — is vitals only, and every view in this tab
// realigns on it.
async function commitVitals(charId, state, command) {
  const patch = applyVitalCommand(state.vitals, command, Math.max(1, state.baseMax));
  const { data, error } = await requireClient().rpc('commit_character_vitals', {
    p_id: charId, p_digest_revision: state.revision, p_hp_basis: state.hpBasis, p_patch: patch,
  });
  if (error) throw error;
  const answer = toAnswer(charId, data);
  const held = latestAnswers.get(answer.characterId);
  if (answer.digestRevision != null && !(held?.digestRevision > answer.digestRevision)) {
    latestAnswers.set(answer.characterId, answer);
  }
  publishCharacterVitals(answer);
  return answer;
}

async function commitHealthCommand(charId, command, context) {
  const route = healthCommandRoute(charId, command, context);
  routeCounts[route === 'digest' ? 'digest' : 'legacy'] += 1;
  const state = route === 'digest'
    ? stateFromDigest(charId, context.digest, context.base)
    : await stateFromSheet(charId);
  let answer = await commitVitals(charId, state, command);
  if (!answer.applied && RELATIVE_COMMANDS.has(command.type)
    && answer.digestRevision != null && answer.hpBasis === state.hpBasis) {
    answer = await commitVitals(charId, { ...state, revision: answer.digestRevision, vitals: answer.vitals }, command);
  }
  if (!answer.applied) {
    throw Object.assign(
      new Error('Character health changed elsewhere. Showing the latest value; please try again.'),
      { code: HEALTH_CONFLICT, answer },
    );
  }
  return answer;
}

// Change a character's health. `digest` and `base` (`{ hpBasis, baseMax }`)
// are what the caller already follows; with them nothing is read before the
// commit and nothing but vitals comes back. Without them (or with a base max of
// another basis) the command reads the sheet once — see healthCommandRoute.
//
// Sent once: a timeout or an error is never resent. A conflict already carried
// the current state back; any other failure asks this tab's followers of the
// character to run their light recovery, and a late commit arrives through the
// digest like any other change.
export function commandCharacterVitals(charId, command, { timeoutMs = HEALTH_COMMAND_TIMEOUT_MS, digest = null, base = null } = {}) {
  // Preserve click order within this tab. Every link settles within the
  // timeout, so a hung request cannot block the queue. Other tabs and devices
  // are serialized by the database's digest check.
  const previous = healthQueues.get(charId) || Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    try {
      return await withTimeout(commitHealthCommand(charId, command, { digest, base }), timeoutMs, 'Character health update');
    } catch (error) {
      if (error?.code !== HEALTH_CONFLICT) requestCharacterRecheck(charId);
      throw error;
    }
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
