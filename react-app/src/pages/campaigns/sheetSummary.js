import { deriveSheetState } from '../charsheet/state.js';
import { getInitiative, getSkillBonus } from '../charsheet/logic/calculations.js';
import { computeBestArmorClass } from '../../shared/character/ac.js';
import { pickCharacterVitals } from '../../shared/character/vitals.js';

const PERCEPTION = { a: 'wis', n: 'Perception' };

// Quick combat-relevant summary from a stored character object. Best-effort:
// wrapped in try/catch so a malformed sheet never breaks the campaign list.
//
// This is what the encounter builder feeds into a combat, both when launching a
// fight and on every live sheet update, so the synced vitals come straight from
// the registry rather than being listed again here. Hand-listing them meant a
// field added to SYNCED_VITALS was dropped in transit — and worse, arrived as an
// empty value that overwrote the combat's own.
export function summarizeCharacter(C) {
  if (!C) return null;
  try {
    const sheet = deriveSheetState(C);
    const inv = Array.isArray(C.inventory) ? C.inventory : [];
    const ac = computeBestArmorClass(C, inv, true)?.value ?? 10;
    const initiative = getInitiative(C, sheet);
    const passivePerception = 10 + getSkillBonus(C, PERCEPTION);
    return {
      ...pickCharacterVitals(sheet),
      maxHP: sheet.maxHP,
      ac,
      passivePerception,
      initiative,
    };
  } catch (_) {
    return null;
  }
}
