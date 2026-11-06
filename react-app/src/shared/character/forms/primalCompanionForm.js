// Ranger Beast Master — Primal Companion (XPHB 2024).
//
// Primal Companion (lv.3): you summon a primal beast — Beast of the Land, of the
// Sea, or of the Sky — whose stat block scales with your Ranger level, Wisdom
// modifier and Proficiency Bonus (Primal Bond: it adds your PB to every ability
// check and saving throw). Its Beast's Strike deals a damage type you choose when
// you summon it. If it died within the last hour you can revive it with a Magic
// action and a spell slot (full HP after 1 minute). After a Long Rest you can
// summon a different beast.
//
// Exceptional Training (lv.7): its hits may deal Force damage instead, and when
// your Bonus Action commands it, it can also Dash/Disengage/Dodge/Help with its
// own Bonus Action. Bestial Fury (lv.11): commanded to use Beast's Strike, it
// uses it twice. Share Spells (lv.15): a spell targeting you can also affect the
// beast within 30 ft.
//
// Which beast is summoned is the builder choice `subclass_beast_companion_type`
// — the one place the builder and the sheet both read and write. The rest lives
// in `C.primalCompanion` (absent until the sheet first changes it):
//   { beast: string, damageType: string, hpCurrent: number | null }
//   `beast` tags the beast this state belongs to: when the choice moves to a
//   different beast, the state is stale and the new one starts fresh.
//   hpCurrent null = at full HP; its maximum comes from the stat block, which
//   grows with the Ranger level, so a number is only stored once it is hurt.
//
// Like the Eldritch Cannon, the beast's HP lives on the character and is NOT a
// synced combat vital.

import { getChoiceValue, setChoiceValuePatch } from '../progression/choiceUtils.js';
import { abilityModifier } from '../progression/abilityModifier.js';
import { ABILITIES } from '../../content/rulesVocabulary.js';

export const PRIMAL_BEASTS = Object.freeze([
  { name: 'Beast of the Land', short: 'Land', damageTypes: ['Bludgeoning', 'Piercing', 'Slashing'] },
  { name: 'Beast of the Sea', short: 'Sea', damageTypes: ['Bludgeoning', 'Piercing'] },
  { name: 'Beast of the Sky', short: 'Sky', damageTypes: ['Slashing'] },
]);
export const PRIMAL_BEAST_SOURCE = 'XPHB';
export const PRIMAL_COMPANION_CHOICE_KEY = 'subclass_beast_companion_type';
export const EXCEPTIONAL_TRAINING_LEVEL = 7;
export const BESTIAL_FURY_LEVEL = 11;
export const SHARE_SPELLS_LEVEL = 15;

const beastByName = (name) => PRIMAL_BEASTS.find((beast) => beast.name === name) || null;

// The damage types Beast's Strike may deal for this beast at this Ranger level.
export function primalStrikeDamageTypes(beastName, rangerLevel) {
  const types = beastByName(beastName)?.damageTypes || PRIMAL_BEASTS[0].damageTypes;
  return Number(rangerLevel) >= EXCEPTIONAL_TRAINING_LEVEL ? [...types, 'Force'] : types;
}

// The companion as the sheet shows it: the chosen beast (Land when none is
// chosen) with its stored damage type and HP, each falling back to a valid
// default.
export function getPrimalCompanion(C, { rangerLevel = 0 } = {}) {
  const beast = beastByName(getChoiceValue(C, PRIMAL_COMPANION_CHOICE_KEY))?.name || PRIMAL_BEASTS[0].name;
  const stored = C?.primalCompanion?.beast === beast ? C.primalCompanion : {};
  const types = primalStrikeDamageTypes(beast, rangerLevel);
  const damageType = types.includes(stored.damageType) ? stored.damageType : types[0];
  const hp = stored.hpCurrent == null ? NaN : Number(stored.hpCurrent);
  return { beast, damageType, hpCurrent: Number.isFinite(hp) ? hp : null };
}

// Current HP clamped to [0, max]; full when never hurt.
export function primalCompanionHp(companion, maxHp) {
  const max = Math.max(0, Number(maxHp) || 0);
  if (companion?.hpCurrent == null) return max;
  return Math.max(0, Math.min(max, Math.round(companion.hpCurrent)));
}

// Summoning a beast (a different one after a Long Rest, or the same one again)
// records it as the builder choice and brings it at full HP with the first
// damage type it allows.
export function summonPrimalBeastPatch(C, beastName, rangerLevel) {
  const beast = beastByName(beastName);
  if (!beast) return null;
  return {
    ...setChoiceValuePatch(C, PRIMAL_COMPANION_CHOICE_KEY, beast.name, { className: 'Ranger' }),
    primalCompanion: {
      beast: beast.name,
      damageType: primalStrikeDamageTypes(beast.name, rangerLevel)[0],
      hpCurrent: null,
    },
  };
}

export function setPrimalDamageTypePatch(companion, damageType) {
  return { primalCompanion: { ...companion, damageType } };
}

export function setPrimalCompanionHpPatch(companion, nextCurrent, maxHp) {
  const max = Math.max(0, Number(maxHp) || 0);
  const clamped = Math.max(0, Math.min(max, Math.round(Number(nextCurrent) || 0)));
  return { primalCompanion: { ...companion, hpCurrent: clamped >= max ? null : clamped } };
}

// Revived with a spell slot, or rested: back to full HP.
export function restorePrimalCompanionPatch(companion) {
  return { primalCompanion: { ...companion, hpCurrent: null } };
}

// "Bludgeoning, Piercing, or Slashing damage (your choice when you summon the
// beast)" — or the Sky beast's plain "Slashing damage" — becomes the chosen type.
const STRIKE_DAMAGE_TEXT = /\b(?:Bludgeoning|Piercing|Slashing)(?:(?:,\s*|,?\s+or\s+)(?:Bludgeoning|Piercing|Slashing))*\s+damage(?:\s*\(your choice when you summon the beast\))?/;

function withStrikeDamageType(action, damageType) {
  if (!/beast's strike/i.test(String(action?.name || ''))) return action;
  const entries = (action.entries || []).map((entry) => (
    typeof entry === 'string' ? entry.replace(STRIKE_DAMAGE_TEXT, `${damageType} damage`) : entry
  ));
  return { ...action, entries };
}

// Applies the Ranger's side of the stat block to a normalized creature: Primal
// Bond (PB on every check and save) and the chosen Beast's Strike damage type.
export function applyPrimalCompanionTraits(creature, { proficiencyBonus = 0, damageType = '' } = {}) {
  if (!creature) return null;
  const pb = Number(proficiencyBonus) || 0;
  const saves = Object.fromEntries(ABILITIES.map((key) => [key, abilityModifier(creature.abilities?.[key]) + pb]));
  return {
    ...creature,
    saves,
    checkBonus: pb,
    actions: damageType ? creature.actions.map((action) => withStrikeDamageType(action, damageType)) : creature.actions,
  };
}
