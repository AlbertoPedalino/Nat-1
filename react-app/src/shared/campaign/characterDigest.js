// Character digests: what the battle map and the encounter builder know about
// a sheet (16_character_digests.sql).
//
// A digest carries the roster facts and the synced vitals as they are stored,
// plus `hpBasis`, a hash of every part of the sheet that could feed max HP.
// Max HP itself is derived by the class/species/feat/item rules, which live in
// JavaScript; a consumer derives the base maximum once per basis from the full
// sheet and adds `maxHPBonus` on top, exactly like deriveSheetState.
//
// Pure: no Supabase, no adapters.

import { normalizeConditions } from '../character/combat/conditions.js';
import { normalizeIconColor } from './roster.js';

function numberOrNull(value) {
  const parsed = Number(value);
  return value == null || value === '' || !Number.isFinite(parsed) ? null : parsed;
}

function deathSavesOf(value) {
  const raw = value || {};
  const clamp = (entry) => Math.max(0, Math.min(3, Math.round(Number(entry) || 0)));
  return { success: clamp(raw.success ?? raw.s), fail: clamp(raw.fail ?? raw.f) };
}

function fromFields(fields, meta) {
  return {
    characterId: String(meta.characterId),
    campaignId: meta.campaignId || null,
    ownerId: meta.ownerId || null,
    rowRevision: Number(meta.rowRevision ?? 0),
    // Where it came from: a digest row from the database is authoritative; one
    // built here from a health command's answer is a preview of it.
    source: meta.source,
    name: String(fields.name || 'Character'),
    ownerUsername: fields.ownerUsername || null,
    className: typeof fields.className === 'string' ? fields.className : null,
    classIconColor: normalizeIconColor(fields.classIconColor),
    portraitPath: typeof fields.portraitPath === 'string' ? fields.portraitPath : null,
    currentHP: numberOrNull(fields.currentHP),
    tempHP: numberOrNull(fields.tempHP),
    maxHPBonus: numberOrNull(fields.maxHPBonus),
    deathSaves: deathSavesOf(fields.deathSaves),
    activeConditions: normalizeConditions(fields.activeConditions),
    hpBasis: typeof fields.hpBasis === 'string' ? fields.hpBasis : null,
  };
}

// A `character_digests` row (REST or realtime) -> digest.
export function toCharacterDigest(row) {
  if (!row?.character_id || !row.digest || typeof row.digest !== 'object') return null;
  return fromFields(row.digest, {
    characterId: row.character_id,
    campaignId: row.campaign_id,
    ownerId: row.owner,
    rowRevision: row.row_revision,
    source: 'server',
  });
}

// A health command's answer in this tab (`{ characterId, vitals,
// digestRevision, hpBasis }`, see commit_character_vitals) as a preview of the
// digest the database has just written: the answer's vitals, revision and
// basis, the roster facts of the digest already held. The revision is the
// digest's own, never the sheet's, so the next command is computed against the
// right token. The database digest of the same revision settles it.
export function digestFromVitalsAnswer(answer, held) {
  if (!answer?.characterId || !answer.vitals || !held) return null;
  if (String(held.characterId) !== String(answer.characterId)) return null;
  const revision = Number(answer.digestRevision);
  if (answer.digestRevision == null || !Number.isFinite(revision)) return null;
  const vitals = answer.vitals;
  return fromFields({
    ...held,
    currentHP: vitals.currentHP,
    tempHP: vitals.tempHP,
    maxHPBonus: vitals.maxHPBonus,
    deathSaves: vitals.deathSaves,
    activeConditions: vitals.activeConditions,
    hpBasis: typeof answer.hpBasis === 'string' ? answer.hpBasis : held.hpBasis,
  }, {
    characterId: held.characterId,
    campaignId: held.campaignId,
    ownerId: held.ownerId,
    rowRevision: revision,
    source: 'local',
  });
}

// Whether `incoming` should replace `held`. Revisions order both streams; on a
// tie the database's digest settles a local preview of the same revision.
export function isNewerDigest(incoming, held) {
  if (!incoming) return false;
  if (!held) return true;
  if (incoming.rowRevision !== held.rowRevision) return incoming.rowRevision > held.rowRevision;
  return incoming.source === 'server' && held.source !== 'server';
}

// Max HP as the sheet derives it: the rules' base maximum plus the bonus.
export function digestMaxHp(digest, baseMax) {
  if (!Number.isFinite(baseMax)) return null;
  return Math.max(1, Math.max(1, baseMax) + Math.round(digest?.maxHPBonus || 0));
}

// The synced vitals, clamped the way deriveSheetState clamps them: an absent
// current HP means undamaged.
export function sheetVitalsFromDigest(digest, baseMax) {
  const maxHP = digestMaxHp(digest, baseMax);
  const stored = digest?.currentHP;
  const currentHP = maxHP == null
    ? null
    : Math.max(0, Math.min(maxHP, stored == null ? maxHP : Math.round(stored)));
  return {
    currentHP,
    tempHP: Math.max(0, Math.round(digest?.tempHP || 0)),
    maxHPBonus: Math.round(digest?.maxHPBonus || 0),
    deathSaves: digest?.deathSaves || { success: 0, fail: 0 },
    activeConditions: digest?.activeConditions || [],
    maxHP,
  };
}

// One roster entry for the battle map. Hit points stay null until the base
// maximum is known; conditions, portrait and class show at once.
export function rosterEntryFromDigest(digest, baseMax) {
  const vitals = sheetVitalsFromDigest(digest, baseMax);
  return {
    characterId: digest.characterId,
    name: digest.name,
    ownerId: digest.ownerId,
    ownerUsername: digest.ownerUsername,
    color: digest.classIconColor,
    className: digest.className,
    deathSaves: digest.deathSaves,
    portraitPath: digest.portraitPath,
    hpCurrent: vitals.currentHP,
    hpMax: vitals.maxHP,
    tempHp: vitals.tempHP,
    conditions: digest.activeConditions,
  };
}

export function rosterFromDigests(digests, baseMax) {
  return [...(digests?.values?.() || [])]
    .map((digest) => rosterEntryFromDigest(digest, baseMax?.get(digest.characterId)?.baseMax))
    .sort((a, b) => a.name.localeCompare(b.name) || a.characterId.localeCompare(b.characterId));
}
