import { createAdapterBindings } from '../adapterBindings.js';
import { WEAPON_FILTERS } from '../../shared/character/weaponFilters.js';
import { getProficiencyBonus } from '../../shared/character/proficiency.js';

// Single source of truth for Fighting Style mechanics.
//
// Each style is a 5etools feat in category "FS"; the feat text is loaded from
// data, but the *rules* are these effect descriptors. Effects are registered by
// feat name (case/spacing-insensitive in the registry), so every class that
// grants a Fighting Style (Fighter, Ranger, Paladin, Bard College of Swords…)
// reuses the same rule with zero duplication.
//
// Effect contract (consumers live in the calc layer):
//   - acBonus { value, requiresArmor }                          → sheetEffects.getAcBonusEffects / ac.js
//   - weaponAttackBonus { value, weaponFilter, requiresSoloWeapon? } → sheetEffects.getWeaponEffectBonuses / actionsTabLogic
//   - weaponDamageBonus { value, weaponFilter, requiresSoloWeapon? } → sheetEffects.getWeaponEffectBonuses / actionsTabLogic
//   - sense { senseType, value }                                → visionSenses.collectSenses
// weaponFilter values come from the shared WEAPON_FILTERS enum (typos → dev-warn,
// never a silent no-op). requiresSoloWeapon gates "no other weapons" (Dueling).
//
// Reaction / activated styles (Protection, Interception) get a card via
// FIGHTING_STYLE_ACTIONS below; their description is auto-resolved LIVE from the
// feat's 5etools entries (rich text, 2024) by the actions layer — no hardcoded text.
//
// Add a new statically-computable style = add a row below. Styles handled outside
// this table because their rule is not a static modifier:
//   - Two-Weapon Fighting   → equipmentSlots.getOffHandDamageMod (off-hand ability mod)
//   - Unarmed Fighting      → unarmed strike die override (actionsTabLogic.makeWeaponActions)
//   - Great Weapon Fighting → reroll 1s/2s on the damage die (dice-roll mechanic, no static value)
const FIGHTING_STYLES = {
  Defense: [
    { type: 'acBonus', value: 1, requiresArmor: true, note: 'Fighting Style: Defense' },
  ],
  Archery: [
    { type: 'weaponAttackBonus', value: 2, weaponFilter: WEAPON_FILTERS.RANGED, note: 'Fighting Style: Archery' },
  ],
  Dueling: [
    { type: 'weaponDamageBonus', value: 2, weaponFilter: WEAPON_FILTERS.ONE_HANDED_MELEE, requiresSoloWeapon: true, note: 'Fighting Style: Dueling' },
  ],
  'Thrown Weapon Fighting': [
    { type: 'weaponDamageBonus', value: 2, weaponFilter: WEAPON_FILTERS.THROWN, note: 'Fighting Style: Thrown Weapon Fighting' },
  ],
  'Blind Fighting': [
    { type: 'sense', senseType: 'blindsight', value: 10, note: 'Fighting Style: Blind Fighting' },
  ],
};

// Reaction cards for activated styles. No `desc`: the actions layer resolves the
// card body from the feat's live 5etools entries (resolveOfficialEntries → feat
// snapshot by ownerName), rendered as rich text via EntryBlocks. Formula fns
// receive { character, ownerLevel } and resolve at render time (PB from the
// canonical getProficiencyBonus, so magic-item PB bonuses are included).
const FIGHTING_STYLE_ACTIONS = {
  Protection: [
    { name: 'Protection', cat: 'reaction', uses: 'Reaction', icon: 'shield' },
  ],
  Interception: [
    {
      name: 'Interception',
      cat: 'reaction',
      uses: 'Reaction',
      icon: 'shield',
      rollers: [{ kind: 'utility', formula: ({ character }) => `1d10+${getProficiencyBonus(character)}`, label: ({ character }) => `Reduce 1d10+${getProficiencyBonus(character)}`, title: 'Reduction' }],
      rollLabelPrefix: 'Interception',
    },
  ],
};

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects, registerFeatSheetActions } = createAdapterBindings(registry, context);

  if (typeof registerFeatSheetEffects === 'function') {
    Object.entries(FIGHTING_STYLES).forEach(([name, effects]) => {
      registerFeatSheetEffects(name, effects);
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    Object.entries(FIGHTING_STYLE_ACTIONS).forEach(([name, actions]) => {
      registerFeatSheetActions(name, actions);
    });
  }
}
