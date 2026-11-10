import { classLevel } from '../progression/classLevel.js';
import { normalizeSummonedCreature } from './summonedCreatures.js';
import { spellcastingNumbers } from '../spells/spellcastingNumbers.js';
import { getProficiencyBonus } from '../progression/proficiency.js';
import { ABILITIES } from '../../content/rulesVocabulary.js';
import { abilityScore, finalAbilityModifier } from '../progression/abilityScores.js';
import { collectSheetEffects } from '../sheet/sheetEffects.js';
import { effectKey } from '../sheet/sheetEffectText.js';
import { wildShapeMaxCr } from './beasts.js';

// The Wild Shape rules that depend on the druid (their features, scores and
// spellcasting): kept apart from wildShapeForm.js, which the ability-score
// code itself reads.

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

// The AC in a form, raised to a feature's minimum (Circle Forms: 13 +
// Wisdom modifier). `formAc` is wildShapeArmorClass's.
export function wildShapeArmorClassWithRules(C, formAc) {
  if (!formAc) return formAc;
  const floor = Math.max(-Infinity, ...wildShapeRules(C).minAc.map((rule) => (
    Number(rule.base || 0) + finalAbilityModifier(C, rule.ability || 'wis')
  )));
  return floor > formAc.value ? { ...formAc, value: floor, formulaLabel: 'Circle Forms' } : formAc;
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
