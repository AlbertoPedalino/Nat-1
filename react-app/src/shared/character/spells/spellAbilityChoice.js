import { ABILITY_NAMES, abilityKey } from '../../content/rulesVocabulary.js';
import { asArray } from '../../lists.js';

// The spellcasting ability of the spells a feat grants, as the builder stores
// it: a pick saved under `<feat slot>_spell_ability`, offered when the feat's
// 5etools data lets the player choose (`additionalSpells[].ability.choose`).
// A 2024 feat whose spells use "the ability increased by this feat" (Ritual
// Caster, Telekinetic: `inherit`) has no pick; its slot's ASI choice decides.

export const SPELL_ABILITY_KEY_SUFFIX = 'spell_ability';

export function spellAbilityChoiceKey(slotKey) {
  return `${slotKey}_${SPELL_ABILITY_KEY_SUFFIX}`;
}

// The choiceUi entry for a feat whose data offers the pick, or null.
export function spellAbilityChoiceUi(feat) {
  const choose = asArray(feat?.additionalSpells)
    .map((grant) => grant?.ability?.choose)
    .find((list) => Array.isArray(list) && list.length);
  if (!choose) return null;
  return {
    keySuffix: SPELL_ABILITY_KEY_SUFFIX,
    label: 'Spellcasting Ability',
    options: choose.map((value) => ({ value, label: ABILITY_NAMES[value] || value })),
  };
}

function firstValue(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value : null;
}

// The ability a feat slot's spells are cast with: its pick, else the ability
// the feat increased. null when neither is stored.
export function featSlotSpellAbility(choices, slotKey) {
  if (!slotKey) return null;
  return abilityKey(
    firstValue(choices?.[spellAbilityChoiceKey(slotKey)])
    || firstValue(choices?.[`${slotKey}_asi`])
    || firstValue(choices?.[`${slotKey}_first_asi`]),
  ) || null;
}
