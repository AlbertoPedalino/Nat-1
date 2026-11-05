import { requireClient } from '../supabaseClient.js';
import { toCharacterDigest } from '../../campaign/characterDigest.js';

// Reads for `character_digests` (16_character_digests.sql) and for the one
// case a digest consumer needs a whole sheet: deriving max HP when its basis
// moved.

const DIGEST_COLUMNS = 'character_id, campaign_id, owner, row_revision, digest';

// Ids the realtime `in` filter can carry verbatim.
export function safeCharacterIds(ids) {
  return [...new Set((ids || []).map((id) => String(id ?? '')).filter((id) => /^[\w-]+$/.test(id)))].sort();
}

// Either every row of one campaign, or the rows of given characters.
async function readDigestRows(columns, { campaignId = null, characterIds = null } = {}) {
  const ids = campaignId ? null : safeCharacterIds(characterIds);
  if (ids && !ids.length) return [];
  const query = requireClient().from('character_digests').select(columns);
  const { data, error } = await (campaignId
    ? query.eq('campaign_id', campaignId)
    : query.in('character_id', ids));
  if (error) throw error;
  return data || [];
}

export async function listCharacterDigests(scope) {
  return (await readDigestRows(DIGEST_COLUMNS, scope)).map(toCharacterDigest).filter(Boolean);
}

// Only ids and revisions (a few bytes a character): what a recovery check
// compares before reading any digest (shared/cloud/sync/revisionDiff.js).
export async function listCharacterDigestRevisions(scope) {
  return (await readDigestRows('character_id, row_revision', scope))
    .map((row) => ({ id: String(row.character_id), version: Number(row.row_revision ?? 0) }));
}

// Full sheets, only to derive their max HP.
export async function readCharacterSheets(ids) {
  const wanted = safeCharacterIds(ids);
  if (!wanted.length) return [];
  const { data, error } = await requireClient()
    .from('characters')
    .select('id, data')
    .in('id', wanted);
  if (error) throw error;
  return data || [];
}
