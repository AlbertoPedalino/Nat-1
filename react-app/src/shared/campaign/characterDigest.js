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

// A full `characters` row this tab just received from a health command. Only
// vitals can have changed through that path, so the max-HP basis is carried
// over from the digest already held; the database's own digest follows.
export function digestFromSheetRow(row, held) {
  if (!row?.id || !row.data || !held) return null;
  const data = row.data;
  return fromFields({
    ...held,
    name: data.name || row.name || held.name,
    currentHP: data.currentHP,
    tempHP: data.tempHP,
    maxHPBonus: data.maxHPBonus,
    deathSaves: data.deathSaves,
    activeConditions: data.activeConditions,
    hpBasis: held.hpBasis,
  }, {
    characterId: row.id,
    campaignId: held.campaignId,
    ownerId: held.ownerId,
    rowRevision: row.row_revision ?? held.rowRevision,
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
