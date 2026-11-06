import { requireClient } from '../supabaseClient.js';
import { loadCharacter as storeLoadCharacter } from '../../character/profile/store.js';
import { applyVitalCommand } from '../../character/combat/vitalCommands.js';
import { pickCharacterVitals } from '../../character/combat/vitals.js';
import { readBaseMaxHp } from '../../campaign/characterVitals.js';
import { publishCharacterVitals, requestCharacterRecheck } from '../sync/characterEvents.js';
import { listCharacterDigests } from './characterDigests.js';
import { healthCommandRoute } from './healthCommandRoute.js';
import { CLOUD_COMMAND_TIMEOUT_MS, withTimeout } from '../cloudCall.js';
import { getCloudCharacter, getCloudSheetRevision, pushCharacter } from './cloudCharacters.js';

// Health commands: hit points, temporary HP, death saves and conditions sent
// as small commands against a character's digest revision, one at a time per
// character, instead of saving the whole sheet.

export const HEALTH_COMMAND_TIMEOUT_MS = CLOUD_COMMAND_TIMEOUT_MS;

export const HEALTH_CONFLICT = 'HEALTH_CONFLICT';

export const HEALTH_TIMEOUT = 'HEALTH_TIMEOUT';

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
    if ((await getCloudSheetRevision(charId)) != null) {
      throw new Error('Character health update requires the database migration.');
    }
    // The first command on a newly created local sheet can precede autosave.
    // Insert its starting state, then apply the intent once via the same RPC.
    // Through pushCharacter, so the local copy records the revision it created
    // and its next autosave is not refused as a conflict with itself.
    if (!storeLoadCharacter(charId)) throw new Error('Character unavailable or no permission.');
    await pushCharacter(charId);
    digest = await readDigest(charId);
    if (!digest) throw new Error('Character health update requires the database migration.');
  }
  const row = await getCloudCharacter(charId, { reason: 'health-fallback' });
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
  // One rule for every command: computed from the health this view holds, and
  // refused if that changed meanwhile (another device, the GM, the map). The
  // refusal already brought the current values here; the user decides again.
  const answer = await commitVitals(charId, state, command);
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
      return await withTimeout(commitHealthCommand(charId, command, { digest, base }), timeoutMs, 'Character health update', HEALTH_TIMEOUT);
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
