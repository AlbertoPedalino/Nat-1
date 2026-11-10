import { tempHpAfter } from '../combat/vitals.js';
import { classLevel } from '../progression/classLevel.js';
import { normalizeSummonedCreature } from './summonedCreatures.js';
import { spellcastingNumbers } from '../spells/spellcastingNumbers.js';
import { getProficiencyBonus } from '../progression/proficiency.js';
import { ABILITIES } from '../../content/rulesVocabulary.js';
import { abilityScore, finalAbilityModifier } from '../progression/abilityScores.js';
import { collectSheetEffects } from '../sheet/sheetEffects.js';
import { effectKey } from '../sheet/sheetEffectText.js';
import { wildShapeMaxCr } from './beasts.js';

// Druid Wild Shape — active form state + every rule of the form.
//
// When a Druid transforms, the resolved beast snapshot is stored directly on the
// character at `C.wildShape` (so stat/AC/HP consumers never need the beast DB at
// compute time). This module holds every rule of the form; each part of the
// sheet asks it one question and branches on nothing else:
//   - ability scores, saves, skills  wildShapeAbilityScore / SaveBonus / SkillBonus
//   - armor class                    wildShapeArmorClass
//   - speed                          wildShapeSpeed
//   - senses                         wildShapeSenses
//   - equipment                      itemEffectInventory (merges: no item counts;
//                                     read through characterItemEffects /
//                                     characterItemBonuses / armor penalties)
//   - attacks and actions            the beast's own, as cards (wildShapeActions.js)
//
// Shape of `C.wildShape` (null when not transformed):
//   { beast: <normalizeBeast snapshot> }   // name, abilities, ac, hp, actions…
// RAW 2024: a transformed Druid keeps their own Hit Points — the beast's HP is
// NOT a separate pool. Assuming a form only grants Temporary HP equal to the
// Druid's level, so HP/maxHP are untouched here.

// Sheet-resource key for Wild Shape uses (registered in the Druid adapter). Both
// Wild Shape and Wild Companion spend from this single pool, so consumers import
// the key from here instead of hardcoding the string.
export const WILD_SHAPE_RESOURCE_KEY = 'wild_shape';

const PHYSICAL_ABILITIES = new Set(['str', 'dex', 'con']);

export function getActiveWildShape(C) {
  const ws = C?.wildShape;
  return ws && ws.beast ? ws : null;
}

export function isWildShaped(C) {
  return getActiveWildShape(C) != null;
}

// Equipment merges into a Wild Shape form (RAW 2024), so item-derived effects are
// suppressed while transformed. Item-bonus consumers route their inventory through
// this single helper instead of each re-checking the form state — keeps the rule
// in one place and makes new consumers correct by default. Returns an empty list
// while shaped, the inventory unchanged otherwise.
export function itemEffectInventory(C, inventory) {
  return isWildShaped(C) ? [] : (inventory || []);
}

// Beast physical ability score while transformed (mental scores stay the
// character's). Returns null when not transformed or the stat isn't physical.
export function wildShapeAbilityScore(C, stat) {
  const ws = getActiveWildShape(C);
  if (!ws) return null;
  const key = String(stat || '').toLowerCase();
  if (!PHYSICAL_ABILITIES.has(key)) return null;
  const score = ws.beast.abilities?.[key];
  return Number.isFinite(score) ? score : null;
}

// The active form's listed saving-throw bonus for `stat`, or null when not
// transformed / the form lists no save for that ability. The value is the beast
// stat block's final number (its own modifier + proficiency already baked in).
// RAW 2024: getSaveBonus uses it only when higher than your own (the "higher-of"
// rule), so it's a candidate bonus, not a replacement.
export function wildShapeSaveBonus(C, stat) {
  const ws = getActiveWildShape(C);
  if (!ws) return null;
  const key = String(stat || '').toLowerCase();
  const v = ws.beast.saves?.[key];
  return Number.isFinite(v) ? v : null;
}

// Whether the active beast form lists a saving-throw bonus for `stat` (drives the
// proficiency marker; the form's proficiencies are gained in addition to yours).
export function wildShapeSaveProficient(C, stat) {
  return wildShapeSaveBonus(C, stat) != null;
}

// The active form's listed skill bonus for `skillName`, or null. Like saves, the
// value is the beast stat block's final number, used when higher than your own.
export function wildShapeSkillBonus(C, skillName) {
  const ws = getActiveWildShape(C);
  if (!ws) return null;
  const key = String(skillName || '').toLowerCase().replace(/[^a-z]/g, '');
  const v = ws.beast.skills?.[key];
  return Number.isFinite(v) ? v : null;
}

// What a feature changes in Wild Shape (`wildShapeRules` effects: the Moon's
// Circle Forms): a higher CR cap (Druid level / `crDivisor`), a minimum AC
// (`minAc: { base, ability }`) and Temporary Hit Points per Druid level.
export function wildShapeRules(C) {
  const rules = { crDivisor: 0, minAc: [], tempHpPerLevel: 1 };
  collectSheetEffects(C).forEach((effect) => {
    if (effectKey(effect.type) !== 'wildshaperules') return;
    const divisor = Number(effect.crDivisor);
    if (divisor > 0 && (!rules.crDivisor || divisor < rules.crDivisor)) rules.crDivisor = divisor;
    if (effect.minAc) rules.minAc.push(effect.minAc);
    rules.tempHpPerLevel = Math.max(rules.tempHpPerLevel, Number(effect.tempHpPerLevel) || 1);
  });
  return rules;
}

// The highest CR a druid may take a form of.
export function wildShapeCrCap(C, druidLevel) {
  const { crDivisor } = wildShapeRules(C);
  const base = wildShapeMaxCr(druidLevel);
  return crDivisor ? Math.max(base, Math.floor(Number(druidLevel || 0) / crDivisor)) : base;
}

// The Temporary Hit Points a form gives: its own (Bear Form), else the Druid
// level times what the druid's features say (Circle Forms: three times).
export function wildShapeTempHp(C, beast, druidLevel) {
  if (beast?.tempHpGrant != null) return Math.max(0, Number(beast.tempHpGrant) || 0);
  return Math.max(0, (Number(druidLevel) || 0) * wildShapeRules(C).tempHpPerLevel);
}

// The beast's stat block replaces your AC (Circle Forms raising it to its
// minimum); null in your own form (or for a form that lists none).
export function wildShapeArmorClass(C) {
  const ws = getActiveWildShape(C);
  if (ws?.beast?.ac == null) return null;
  const floor = Math.max(-Infinity, ...wildShapeRules(C).minAc.map((rule) => (
    Number(rule.base || 0) + finalAbilityModifier(C, rule.ability || 'wis')
  )));
  return {
    value: Math.max(Number(ws.beast.ac), floor),
    source: `Wild Shape (${ws.beast.name})`,
    label: 'AC (Beast)',
    formulaLabel: 'Beast',
    shieldApplied: false,
    shieldBonus: 0,
    sourceType: 'wildshape',
  };
}

// The beast's speeds replace yours; null in your own form.
export function wildShapeSpeed(C) {
  return getActiveWildShape(C)?.beast?.speed ?? null;
}

// The beast's senses ("Darkvision 60 ft.") as { type, range, note }; empty in
// your own form. They join your other senses, the best range winning.
export function wildShapeSenses(C) {
  const ws = getActiveWildShape(C);
  if (!ws) return [];
  return (ws.beast.senses || []).map((text) => {
    const m = String(text || '').match(/^([A-Za-z' ]+?)\s+(\d+)\s*ft/i);
    if (!m) return null;
    const type = m[1].toLowerCase().replace(/[^a-z]/g, '');
    const range = Number(m[2]);
    return type && range ? { type, range, note: text } : null;
  }).filter(Boolean);
}

// Build the `C.wildShape` patch for assuming a beast form. Caller (sheet panel)
// merges the returned patch into the character via onUpdateCharacter.
// RAW 2024: HP/maxHP are untouched (you keep your own); the form only grants
// Temporary HP equal to your Druid level. Temp HP doesn't stack, so keep the
// larger of any existing temp HP and the new grant (also handles re-transforming
// after the form's temp HP took damage).
export function enterWildShapePatch(C, beast, druidLevel) {
  if (!beast) return null;
  const granted = wildShapeTempHp(C, beast, druidLevel);
  const tempHP = tempHpAfter(C?.tempHP, 'grantTempHp', granted);
  return {
    wildShape: { beast },
    tempHP,
  };
}

// A feature form (Bear Form, Cat Form) as the druid who takes it has it: its
// rule-stated AC, scores, skills and attacks resolved with the druid's
// Wisdom, Druid level and spellcasting numbers, in the beast snapshot shape.
export function featureFormSnapshot(C, form) {
  if (!form?.record) return null;
  const level = classLevel(C, 'Druid');
  const numbers = spellcastingNumbers(C, 'wis');
  const abilityScores = Object.fromEntries(ABILITIES.map((ability) => [ability, abilityScore(C, ability, { ignoreWildShape: true })]));
  const creature = normalizeSummonedCreature(form.record, {
    classLevel: level,
    abilityMod: numbers.abilityModifier,
    spellAttackBonus: numbers.attack,
    spellSaveDc: numbers.dc,
    abilityScores,
    proficiencyBonus: getProficiencyBonus(C),
  });
  if (!creature) return null;
  return {
    ...creature,
    crNum: null,
    cr: '—',
    acFrom: '',
    tempHpGrant: creature.hp?.temporary ? Number(creature.hp.average) || 0 : null,
  };
}

// Build the patch for reverting to the character's own form. Your HP was never
// replaced, so there's nothing to restore — just end the form. Temporary HP
// persists like any other temp HP (it isn't tied to staying in the form), so
// it's intentionally left untouched.
export function exitWildShapePatch() {
  return { wildShape: null };
}
