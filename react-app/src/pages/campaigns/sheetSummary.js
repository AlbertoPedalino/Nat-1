import { deriveSheetState } from '../charsheet/state.js';
import { getInitiative, getSkillBonus } from '../charsheet/logic/calculations.js';
import { computeBestArmorClass } from '../../shared/character/ac.js';

const PERCEPTION = { a: 'wis', n: 'Perception' };

// Quick combat-relevant summary from a stored character object. Best-effort:
// wrapped in try/catch so a malformed sheet never breaks the campaign list.
export function summarizeCharacter(C) {
  if (!C) return null;
  try {
    const sheet = deriveSheetState(C);
    const inv = Array.isArray(C.inventory) ? C.inventory : [];
    const ac = computeBestArmorClass(C, inv, true)?.value ?? 10;
    const initiative = getInitiative(C, sheet);
    const passivePerception = 10 + getSkillBonus(C, PERCEPTION);
    return {
      currentHP: sheet.currentHP,
      maxHP: sheet.maxHP,
      maxHPBonus: sheet.maxHPBonus,
      tempHP: sheet.tempHP,
      deathSaves: sheet.deathSaves,
      ac,
      passivePerception,
      initiative,
    };
  } catch (_) {
    return null;
  }
}
