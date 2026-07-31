import { computeMaxHp as sharedComputeMaxHp } from '../../../shared/character/hp.js';
import { getFeatAsiBonus } from '../../../shared/character/abilityBonuses.js';
import { installedRegistry } from '../../../adapters/index.js';
import { extractFixedProficiencyLabels } from '../../../shared/character/typedProficiencies.js';
import { getFinalAbilityScore } from '../../../shared/character/itemEffects.js';
import { wildShapeAbilityScore, wildShapeSaveBonus, wildShapeSaveProficient, wildShapeSkillBonus } from '../../../shared/character/wildShapeForm.js';
import { getProficiencyBonus } from '../../../shared/character/proficiency.js';
import { primaryClassLevel } from '../../../shared/character/classLevel.js';
import { XP_THRESHOLDS } from '../../../shared/character/xp.js';
import { collectSheetEffects } from './sheetEffects.js';
import { getNormalizedChoices } from '../../../shared/choiceNormalization.js';

const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const SLBL = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const FULL_LBL = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

export const SKILLS = [
  { n: 'Acrobatics', a: 'dex' }, { n: 'Animal Handling', a: 'wis' }, { n: 'Arcana', a: 'int' },
  { n: 'Athletics', a: 'str' }, { n: 'Insight', a: 'wis' }, { n: 'Sleight of Hand', a: 'dex' },
  { n: 'Stealth', a: 'dex' }, { n: 'Investigation', a: 'int' }, { n: 'Deception', a: 'cha' },
  { n: 'Perception', a: 'wis' }, { n: 'Intimidation', a: 'cha' }, { n: 'Medicine', a: 'wis' },
  { n: 'Nature', a: 'int' }, { n: 'History', a: 'int' }, { n: 'Performance', a: 'cha' },
  { n: 'Persuasion', a: 'cha' }, { n: 'Religion', a: 'int' }, { n: 'Survival', a: 'wis' },
];

export const COMBAT_ACTIONS = [
  { name: 'Attack', desc: 'Make an attack with a weapon.' },
  { name: 'Dodge', desc: 'Until your next turn, every attack roll against you has disadvantage if you can see the attacker.' },
  { name: 'Disengage', desc: 'Your movement does not provoke opportunity attacks for the rest of the turn.' },
  { name: 'Hide', desc: 'Make a Dexterity (Stealth) check to hide.' },
  { name: 'Help', desc: 'Grant advantage to an ally on an attack roll or ability check.' },
  { name: 'Dash', desc: 'Your movement doubles for this turn.' },
  { name: 'Ready', desc: 'Prepare an action to execute in response to a specific trigger.' },
  { name: 'Study', desc: 'Make an Intelligence check to gain information about a target.' },
  { name: 'Influence', desc: 'Make a Charisma (Persuasion/Deception/Intimidation) check against a target.' },
  { name: 'Grapple', desc: 'Try to restrain a creature with an Athletics check.' },
  { name: 'Shove', desc: 'Try to push or knock prone a creature.' },
];

// Exhaustion (XPHB 2024) is graded 1–6, not a boolean condition, so it lives in
// sheet.exhaustionLevel rather than CONDITION_EFFECTS. Each level: −2 to every
// D20 Test and −5 ft Speed; level 6 = death. The numbers live here as the single
// source — consumers (rollD20, Movement) derive penalties from these helpers.
export const EXHAUSTION_MAX = 6;
const EXHAUSTION_D20_PER_LEVEL = 2;
const EXHAUSTION_SPEED_PER_LEVEL = 5;
export function clampExhaustion(level) {
  return Math.max(0, Math.min(EXHAUSTION_MAX, Math.floor(Number(level) || 0)));
}
export function exhaustionD20Penalty(level = 0) {
  return EXHAUSTION_D20_PER_LEVEL * clampExhaustion(level);
}
export function exhaustionSpeedPenalty(level = 0) {
  return EXHAUSTION_SPEED_PER_LEVEL * clampExhaustion(level);
}

// The d20 modifier actually used once Exhaustion is applied. Every roll-button
// display calls this so the shown number matches what rollD20 produces (rollD20
// applies the same penalty to the live roll). Single source = no per-site drift.
// Displays show the effective value but still pass the RAW bonus to the roller,
// which subtracts the penalty itself — so the penalty is counted exactly once.
export function effectiveD20Modifier(rawBonus, exhaustionLevel = 0) {
  return rawBonus - exhaustionD20Penalty(exhaustionLevel);
}

export const SCHOOL_LABELS = { A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment', I: 'Illusion', N: 'Necromancy', T: 'Transmutation', V: 'Evocation' };
export const SPELL_LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const XP_TABLE = XP_THRESHOLDS; // single source of truth: shared/character/xp.js

export { STATS, SLBL, FULL_LBL, XP_TABLE };

export function getBase(C, stat) {
  if (!C) return 10;
  const m = C.scoreMethod;
  if (m === 'pointbuy') return C.pbScores?.[stat] || 8;
  if (m === 'standard') { const v = C.arrAssign?.[stat]; return v != null ? v : 8; }
  if (m === 'manual') { const v = C.manualScores?.[stat]; return v != null ? v : 8; }
  const v = C.diceAssign?.[stat]; return v != null ? v : 8;
}

export function bgBonus(C, stat) {
  if (!C?.backgroundAbilities?.length) return 0;
  const idx = C.backgroundAbilities.indexOf(stat);
  return idx < 0 ? 0 : idx === 0 ? 2 : 1;
}

export function getAsiFeatBonus(C, stat) {
  return getFeatAsiBonus(C, stat);
}

export function getFinal(C, stat) {
  // Wild Shape replaces physical scores (STR/DEX/CON) with the beast's; mental
  // scores stay the character's. Replacement, not a floor — so it short-circuits
  // before background/ASI/item layers.
  const formScore = wildShapeAbilityScore(C, stat);
  if (formScore != null) return formScore;
  const base = getBase(C, stat) + bgBonus(C, stat) + getAsiFeatBonus(C, stat);
  return getFinalAbilityScore(C, stat, base);
}

export function getMod(v) { return Math.floor((v - 10) / 2); }

export const getPB = getProficiencyBonus;

export function fmod(v) { const m = getMod(v); return (m >= 0 ? '+' : '') + m; }

export function fbonus(n) { return (n >= 0 ? '+' : '') + n; }

// Whether YOUR class grants a save proficiency for `stat` (your own, computed
// with your Proficiency Bonus). Wild Shape keeps these (RAW 2024).
function hasOwnSaveProficiency(C, stat) {
  return Boolean(C && (C.clsSnapshot?.proficiency || []).includes(stat));
}

export function hasSaveProficiency(C, stat) {
  // RAW 2024: while transformed you retain your own save proficiencies AND gain
  // the form's, so the marker shows for either.
  if (hasOwnSaveProficiency(C, stat)) return true;
  return wildShapeSaveProficient(C, stat);
}

export function getSaveBonus(C, stat) {
  // Your own save bonus uses your scores (already swapped to the beast's physical
  // scores while transformed) + your PB if class-proficient.
  const own = getMod(getFinal(C, stat)) + (hasOwnSaveProficiency(C, stat) ? getPB(C) : 0);
  // RAW 2024: if the form's listed save modifier is higher than yours, use it.
  const formSave = wildShapeSaveBonus(C, stat);
  return formSave != null ? Math.max(own, formSave) : own;
}

function initEffectType(t) {
  return String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Passive, always-on bonuses to Initiative. Adapters (class/subclass/species/feat)
// grant these via sheet effects:
//   { type: 'initiativeProficiency' }            → + Proficiency Bonus (Alert feat)
//   { type: 'initiativeAbilityMod', ability:'wis'} → + ability modifier  (e.g. Gloom Stalker)
//   { type: 'initiativeFlat', value: n }         → + flat n
// Plus Jack of All Trades (+½ PB), derived from the same trait that feeds skills.
// Conditional bonuses (e.g. Bard Dance "Tandem Footwork", which expends a Bardic
// Inspiration) are intentionally NOT collected here — they are display-only.
// Returns a breakdown [{ source, amount }] so callers can also show a tooltip.
export function collectInitiativeModifiers(C) {
  const out = [];
  let hasFullProficiency = false;
  collectSheetEffects(C).forEach((e) => {
    const t = initEffectType(e.type);
    if (t === 'initiativeproficiency') {
      hasFullProficiency = true;
      out.push({ source: e.note || e.ownerName || 'Proficiency', amount: getPB(C) });
    } else if (t === 'initiativeabilitymod' && e.ability) {
      out.push({ source: e.note || e.ownerName || String(e.ability).toUpperCase(), amount: getMod(getFinal(C, e.ability)) });
    } else if (t === 'initiativeflat' && e.value != null) {
      out.push({ source: e.note || e.ownerName || 'Bonus', amount: Number(e.value) || 0 });
    }
  });
  // Jack of All Trades adds ½ PB only to checks that don't already include PB,
  // so skip it when something (e.g. Alert) already grants full Proficiency Bonus.
  if (!hasFullProficiency && hasHalfProficiencyOnUntrainedChecks(C)) {
    out.push({ source: 'Jack of All Trades', amount: Math.floor(getPB(C) / 2) });
  }
  return out;
}

// Final Initiative modifier: DEX mod + adapter bonuses − exhaustion D20 penalty.
export function getInitiative(C, sheet) {
  const dex = getMod(getFinal(C, 'dex'));
  const bonus = collectInitiativeModifiers(C).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  return dex + bonus - exhaustionD20Penalty(sheet?.exhaustionLevel);
}

export function normSkill(s) {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

function skillChoiceLabel(value) {
  const raw = String(value || '').split('|')[0].trim();
  const typed = raw.match(/^(skill|tool|language|weapon):(.+)$/i);
  if (typed) return typed[1].toLowerCase() === 'skill' ? typed[2].trim() : '';
  return raw;
}

function valuesIncludeSkill(values, skillName) {
  const nsk = normSkill(skillName);
  if (!nsk) return false;
  return (Array.isArray(values) ? values : [values])
    .some((value) => normSkill(skillChoiceLabel(value)) === nsk);
}

function proficiencyBearingFeatures(C) {
  return [
    C?.backgroundSnapshot,
    C?.speciesSnapshot,
    ...(C?.allClassFeatures || []),
    ...(C?.allSubFeatures || []),
    ...(C?.allFeatSnapshots || []),
    ...((C?.extraClasses || []).flatMap((extra) => [
      ...(extra?.allClassFeatures || extra?.allFeatures || []),
      ...(extra?.allSubFeatures || []),
    ])),
  ].filter(Boolean);
}

function collectFixedProficiencyLabels(C, fields) {
  const features = proficiencyBearingFeatures(C);
  return features.flatMap((feature) => (Array.isArray(fields) ? fields : [fields])
    .flatMap((field) => extractFixedProficiencyLabels(feature[field])));
}

function collectFixedSkillLabels(C) {
  return collectFixedProficiencyLabels(C, ['skillProficiencies', 'skillToolLanguageProficiencies']);
}

function characterClassEntities(C) {
  if (!C) return [];
  const out = [];
  if (C.className) {
    out.push({
      className: C.className,
      subclassShortName: C.subclassShortName || '',
      level: primaryClassLevel(C),
    });
  }
  (C.extraClasses || []).forEach((extra) => {
    if (!extra?.name) return;
    out.push({
      className: extra.name,
      subclassShortName: extra.subclassShortName || '',
      level: Number(extra.level || 1),
    });
  });
  return out;
}

function collectRuntimeEffects(C) {
  const effects = [];
  characterClassEntities(C).forEach((entity) => {
    (installedRegistry.getClassSheetEffects(entity.className) || []).forEach((effect) => {
      if (entity.level >= Number(effect?.minLevel || 1)) effects.push(effect);
    });
    if (entity.subclassShortName) {
      (installedRegistry.getSubclassSheetEffects(entity.className, entity.subclassShortName) || []).forEach((effect) => {
        if (entity.level >= Number(effect?.minLevel || 1)) effects.push(effect);
      });
    }
  });

  const serialized = C?.adapterRuntime || {};
  [
    ...(serialized.classEffects || []),
    ...(serialized.subclassEffects || []),
    ...(serialized.speciesEffects || []),
    ...(serialized.featEffects || []),
  ].forEach((effect) => {
    const ownerLevel = Number(effect?.ownerLevel || primaryClassLevel(C));
    if (ownerLevel >= Number(effect?.minLevel || 1)) effects.push(effect);
  });

  return effects;
}

function hasHalfProficiencyOnUntrainedChecks(C) {
  return collectRuntimeEffects(C).some((effect) => {
    const type = String(effect?.type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const bonus = String(effect?.bonus || '').toLowerCase();
    return type === 'jackofalltrades' || bonus.includes('halfproficiency');
  });
}

export function getSkillProficiency(C, skillName) {
  // normalizedChoices is the single source of truth for choice-derived skills and
  // expertise (built in the builder reducer, recomputed here if absent). Expertise
  // is checked first because it upgrades a skill that is also recorded as a plain
  // proficiency — otherwise the 'prof' match would mask it.
  const normalized = getNormalizedChoices(C);
  if (valuesIncludeSkill(normalized.expertise || [], skillName)) return 'exp';
  if (valuesIncludeSkill(normalized.skills || [], skillName)) return 'prof';
  // Fixed proficiencies from background/species/features are not choice-derived,
  // so they live outside normalizedChoices and are resolved separately.
  const bgFixed = (C?.backgroundSnapshot?.skillProficiencies || []).flatMap(sp => Object.keys(sp).filter(k => k !== 'choose'));
  if (valuesIncludeSkill(bgFixed, skillName)) return 'prof';
  if (valuesIncludeSkill(collectFixedSkillLabels(C), skillName)) return 'prof';
  return null;
}

export function getSkillTraining(C, skillName) {
  const proficiency = getSkillProficiency(C, skillName);
  if (proficiency === 'exp' || proficiency === 'prof') return proficiency;
  if (hasHalfProficiencyOnUntrainedChecks(C)) return 'half';
  return null;
}

export function getSkillBonus(C, sk) {
  const m = getMod(getFinal(C, sk.a));
  const training = getSkillTraining(C, sk.n);
  let own = m;
  if (training === 'exp') own = m + getPB(C) * 2;
  else if (training === 'prof') own = m + getPB(C);
  else if (training === 'half') own = m + Math.floor(getPB(C) / 2);
  // RAW 2024 Wild Shape: keep your own skill proficiencies, but if the form's
  // listed skill modifier is higher than yours, use it.
  const formSkill = wildShapeSkillBonus(C, sk.n);
  return formSkill != null ? Math.max(own, formSkill) : own;
}

export function calcMaxHP(C) {
  if (!C) return 10;
  // Hit Points are retained while Wild Shaped (RAW 2024), so max HP always uses
  // your OWN Constitution — never the beast's. Bypass the form's score
  // replacement (don't use getFinal) so transforming never changes max HP.
  const conBase = getBase(C, 'con') + bgBonus(C, 'con') + getAsiFeatBonus(C, 'con');
  const conScore = getFinalAbilityScore(C, 'con', conBase, { ignoreWildShape: true });
  return sharedComputeMaxHp(C, getMod(conScore));
}
