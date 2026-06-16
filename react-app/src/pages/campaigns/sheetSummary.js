import { deriveSheetState } from '../charsheet/state.js';
import { getInitiative, getSkillBonus } from '../charsheet/logic/calculations.js';
import { computeBestArmorClass, getEquippedArmor } from '../../shared/character/ac.js';
import { selectedFeatNames, collectSheetEffects, getAcBonusEffects } from '../charsheet/logic/sheetEffects.js';

const PERCEPTION = { a: 'wis', n: 'Perception' };

// TEMP DEBUG (encounter AC bug): dump why the Defense +1 may be missing.
function debugAc(C, inv) {
  try {
    const fsChoices = Object.entries(C?.choices || {})
      .filter(([k]) => /fight|feat|boon/i.test(k));
    const feats = selectedFeatNames(C);
    const acbonusEffects = collectSheetEffects(C)
      .filter((e) => String(e.type || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'acbonus')
      .map((e) => ({ owner: e.ownerName, value: e.value, requiresArmor: e.requiresArmor, note: e.note }));
    const wearingArmor = !!getEquippedArmor(C, inv);
    const equipped = (inv || []).filter((i) => i.equipped).map((i) => ({ name: i.name, type: i.type, ac: i.ac, bonusAc: i.bonusAc }));
    // eslint-disable-next-line no-console
    console.warn('[AC-DEBUG]', C?.name, {
      fsChoices,
      selectedFeatNames: feats,
      hasDefense: feats.some((f) => /defense/i.test(f)),
      acbonusEffects,
      wearingArmor,
      acBonusWithArmor: getAcBonusEffects(C, { wearingArmor: true }),
      acBonusComputed: getAcBonusEffects(C, { wearingArmor }),
      equipped,
      allFeatSnapshotNames: (C?.allFeatSnapshots || []).map((f) => f?.name),
      finalAc: computeBestArmorClass(C, inv, true)?.value,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[AC-DEBUG] failed for', C?.name, e);
  }
}

// Quick combat-relevant summary from a stored character object. Best-effort:
// wrapped in try/catch so a malformed sheet never breaks the campaign list.
export function summarizeCharacter(C) {
  if (!C) return null;
  try {
    const sheet = deriveSheetState(C);
    const inv = Array.isArray(C.inventory) ? C.inventory : [];
    debugAc(C, inv);
    const ac = computeBestArmorClass(C, inv, true)?.value ?? 10;
    const initiative = getInitiative(C, sheet);
    const passivePerception = 10 + getSkillBonus(C, PERCEPTION);
    return { currentHP: sheet.currentHP, maxHP: sheet.maxHP, ac, passivePerception, initiative };
  } catch (_) {
    return null;
  }
}
