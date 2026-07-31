import { summarizeCharacter } from '../../campaigns/sheetSummary.js';
import { clampInt, numberOr } from './monsterUtils.js';
import { combatantToSheetPatch, resolveCombatVitals } from './sheetSync.js';

// Maps a stored campaign character row into the player shape the encounter
// builder imports. Kept out of `useCampaignPlayers` — which must import the
// adapter barrel for its loaders, and so cannot be loaded by a test runner —
// so this mapping stays covered.

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export function getCharacterLevel(character) {
  const explicit = Number(character?.level);
  if (Number.isFinite(explicit) && explicit > 0) return clampInt(explicit, 1, 20, 1);
  const primary = Number(character?.classLevel);
  const extras = Array.isArray(character?.extraClasses)
    ? character.extraClasses.reduce((sum, item) => sum + numberOr(item?.level, 0), 0)
    : 0;
  const total = (Number.isFinite(primary) && primary > 0 ? primary : 0) + extras;
  return clampInt(total || 1, 1, 20, 1);
}

export function normalizeIconColor(value) {
  const color = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR_RE.test(color) ? color.toLowerCase() : null;
}

export function characterClassNames(character) {
  return [
    character?.className,
    ...(Array.isArray(character?.extraClasses) ? character.extraClasses.map((entry) => entry?.name) : []),
  ].filter(Boolean);
}

export function toEncounterPlayer(row, campaign) {
  const sheet = row?.data || {};
  const summary = summarizeCharacter(sheet) || {};
  const hpMax = summary.maxHP ?? summary.currentHP ?? sheet.maxHP ?? 10;
  // resolveCombatVitals first, because it is the one that knows an absent
  // current HP means "undamaged" rather than 0; combatantToSheetPatch then puts
  // every synced field into the `data` shape the player object carries. Listing
  // those fields by hand here is what dropped conditions on import.
  const vitals = resolveCombatVitals({ hpMax }, { ...summary, hpMax });
  return {
    id: row.id,
    sourceId: row.id,
    campaignId: campaign.id,
    campaignName: campaign.name || 'Campaign',
    name: sheet.name || row.name || 'Character',
    ownerUsername: row.owner_username || null,
    level: getCharacterLevel(sheet),
    ac: clampInt(summary.ac, 1, 99, 10),
    hpMax: clampInt(hpMax, 1, 999, 10),
    ...combatantToSheetPatch(vitals),
    initMod: clampInt(summary.initiative, -20, 30, 0),
    iconColor: normalizeIconColor(sheet.classIconColor),
    updatedAt: row.updated_at || null,
  };
}
