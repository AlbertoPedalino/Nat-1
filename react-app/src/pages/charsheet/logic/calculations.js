import { computeMaxHp as sharedComputeMaxHp } from '../../../shared/character/hp.js';
import { getFeatAsiBonus } from '../../../shared/character/abilityBonuses.js';
import { installedRegistry } from '../../../adapters/index.js';
import { extractFixedProficiencyLabels } from '../../../shared/character/typedProficiencies.js';
import { getFinalAbilityScore, getItemProficiencyBonus } from '../../../shared/character/itemEffects.js';

const PB_TABLE = [null, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];
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

export const CONDITIONS = [
  { key: 'blinded', label: 'Blinded', icon: 'EyeOff' }, { key: 'charmed', label: 'Charmed', icon: 'Heart' },
  { key: 'deafened', label: 'Deafened', icon: 'Ear' }, { key: 'frightened', label: 'Frightened', icon: 'Ghost' },
  { key: 'grappled', label: 'Grappled', icon: 'Hand' }, { key: 'incapacitated', label: 'Incapacitated', icon: 'Pause' },
  { key: 'invisible', label: 'Invisible', icon: 'CircleDashed' }, { key: 'paralyzed', label: 'Paralyzed', icon: 'Brain' },
  { key: 'petrified', label: 'Petrified', icon: 'Mountain' }, { key: 'poisoned', label: 'Poisoned', icon: 'FlaskConical' },
  { key: 'prone', label: 'Prone', icon: 'ArrowDown' }, { key: 'restrained', label: 'Restrained', icon: 'Link' },
  { key: 'stunned', label: 'Stunned', icon: 'Zap' }, { key: 'unconscious', label: 'Unconscious', icon: 'Moon' },
  { key: 'exhaustion', label: 'Exhaustion', icon: 'BatteryLow' },
];

// Conditions that inherently impose other conditions (XPHB 2024). Applying the
// parent auto-applies these so the sheet reflects the full rules effect. Removal
// is not cascaded (the implied condition may also stand on its own).
export const CONDITION_IMPLIES = {
  paralyzed: ['incapacitated'],
  petrified: ['incapacitated'],
  stunned: ['incapacitated'],
  unconscious: ['incapacitated', 'prone'],
};

export const SCHOOL_LABELS = { A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment', I: 'Illusion', N: 'Necromancy', T: 'Transmutation', V: 'Evocation' };
export const SPELL_LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

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
  const base = getBase(C, stat) + bgBonus(C, stat) + getAsiFeatBonus(C, stat);
  return getFinalAbilityScore(C, stat, base);
}

export function getMod(v) { return Math.floor((v - 10) / 2); }

export function getPB(C) {
  const base = C ? (PB_TABLE[C.level] || 2) : 2;
  return base + getItemProficiencyBonus(C);
}

export function fmod(v) { const m = getMod(v); return (m >= 0 ? '+' : '') + m; }

export function fbonus(n) { return (n >= 0 ? '+' : '') + n; }

export function hasSaveProficiency(C, stat) {
  return C && (C.clsSnapshot?.proficiency || []).includes(stat);
}

export function getSaveBonus(C, stat) {
  const m = getMod(getFinal(C, stat));
  return m + (hasSaveProficiency(C, stat) ? getPB(C) : 0);
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
      level: Number(C.classLevel || C.level || 1),
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
    const ownerLevel = Number(effect?.ownerLevel || C?.classLevel || C?.level || 1);
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
  const normalized = C?.normalizedChoices || {};
  if (valuesIncludeSkill(normalized.expertise || [], skillName)) return 'exp';
  if (valuesIncludeSkill(normalized.skills || [], skillName)) return 'prof';
  const skillData = C?.selectedSkills || {};
  const profList = Array.isArray(skillData) ? skillData : (skillData.proficient || []);
  const expList = Array.isArray(skillData) ? [] : (skillData.expert || []);
  if (valuesIncludeSkill(expList, skillName)) return 'exp';
  if (valuesIncludeSkill(profList, skillName)) return 'prof';
  const bgFixed = (C?.backgroundSnapshot?.skillProficiencies || []).flatMap(sp => Object.keys(sp).filter(k => k !== 'choose'));
  if (valuesIncludeSkill(bgFixed, skillName)) return 'prof';
  if (valuesIncludeSkill(collectFixedSkillLabels(C), skillName)) return 'prof';
  if (C?.choices) {
    for (const [key, val] of Object.entries(C.choices)) {
      if (!val) continue;
      const lk = String(key || '').toLowerCase();
      if (lk.includes('exp') || lk.includes('expertise')) {
        const vals = Array.isArray(val) ? val : [val];
        if (valuesIncludeSkill(vals, skillName)) return 'exp';
      }
      if (lk.includes('skill') || lk.startsWith('start_skills')) {
        const vals = Array.isArray(val) ? val : [val];
        if (valuesIncludeSkill(vals, skillName)) return 'prof';
      }
    }
  }
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
  if (training === 'exp') return m + getPB(C) * 2;
  if (training === 'prof') return m + getPB(C);
  if (training === 'half') return m + Math.floor(getPB(C) / 2);
  return m;
}

export function calcMaxHP(C) {
  if (!C) return 10;
  return sharedComputeMaxHp(C, getMod(getFinal(C, 'con')));
}

export function getLevelFromXp(xp) {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]) return i;
  }
  return 1;
}

export function getXpForNextLevel(level) {
  return XP_TABLE[level] || 0;
}
