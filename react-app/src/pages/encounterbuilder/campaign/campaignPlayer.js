import { summarizeCharacter } from '../../../shared/campaign/sheetSummary.js';
import { combatantToSheetPatch, resolveCombatVitals } from '../../../shared/encounter/sheetSync.js';
import { clampPlayerStats } from '../../../shared/encounter/combat.js';
import { totalLevel } from '../../../shared/character/progression/classLevel.js';
import { normalizeHexColor } from '../../../shared/ui/colors.js';

// Maps a stored campaign character row into the player shape the encounter
// builder imports. Kept out of `useCampaignPlayers` — which must import the
// adapter barrel for its loaders, and so cannot be loaded by a test runner —
// so this mapping stays covered.

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
    level: totalLevel(sheet),
    ...clampPlayerStats({ ac: summary.ac, hpMax, initMod: summary.initiative }),
    ...combatantToSheetPatch(vitals),
    iconColor: normalizeHexColor(sheet.classIconColor),
    // The face the sheet chose. A path, not a picture: the bytes are in the
    // bucket and every screen that shows this character reads the same one.
    portraitPath: typeof sheet.portraitPath === 'string' ? sheet.portraitPath : null,
    updatedAt: row.updated_at || null,
  };
}
