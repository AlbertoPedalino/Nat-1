import {
  FULL_SLOTS,
  HALF_SLOTS,
  PACT_SLOTS,
  PB_COST,
  PROFICIENCY_BONUS,
  STATS,
  THIRD_SLOTS,
} from '../constants.js';
import { computeMaxHp as sharedComputeMaxHp } from '../../../shared/character/hp.js';
import { getFeatAsiBonus } from '../../../shared/character/abilityBonuses.js';
import { collectOwnedFeatNames } from '../../../shared/character/selectedFeats.js';

export function formatMod(value) {
  const mod = Math.floor((Number(value || 0) - 10) / 2);
  return `${mod >= 0 ? '+' : ''}${mod}`;
}

export function statMod(value) {
  return Math.floor((Number(value || 0) - 10) / 2);
}

export function pointBuySpent(scores) {
  return STATS.reduce((sum, stat) => sum + (PB_COST[scores[stat]] || 0), 0);
}

export function getBackgroundPool(background) {
  if (!background?.ability?.length) return STATS;
  const ability = background.ability[0];
  if (ability.choose?.weighted?.from?.length) return ability.choose.weighted.from;
  if (ability.choose?.from?.length) return ability.choose.from;
  const direct = Object.keys(ability).filter((key) => STATS.includes(key));
  return direct.length ? direct : STATS;
}

export function getBackgroundPattern(background, index = 0) {
  if (!background?.ability?.length) return [2, 1];
  const ability = background.ability[Math.min(index, background.ability.length - 1)];
  if (ability?.choose?.weighted?.weights?.length) return ability.choose.weighted.weights;
  const values = Object.values(ability || {}).filter((value) => typeof value === 'number').sort((a, b) => b - a);
  return values.length ? values : [2, 1];
}

export function getBackgroundBonus(character, stat) {
  const idx = (character.backgroundAbilities || []).indexOf(stat);
  if (idx < 0) return 0;
  const pattern = character.backgroundPattern || [2, 1];
  return pattern[idx] || 0;
}

function normalizeStat(value) {
  const key = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  const aliases = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha',
  };
  return aliases[key] || key;
}

function abilityBonusSourceLabel(key) {
  const value = String(key || '');
  const levelMatch = value.match(/lv(\d+)/i);
  if (levelMatch) return `Feat Lv.${levelMatch[1]}`;
  if (value.includes('origin')) return 'Origin Feat';
  return 'Feat';
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export function getBaseScore(character, stat) {
  let base = 8;
  if (character.scoreMethod === 'standard') base = character.arrAssign[stat] ?? 8;
  else if (character.scoreMethod === 'manual') base = character.manualScores[stat] ?? 8;
  else if (character.scoreMethod === 'dice') base = character.diceAssign[stat] ?? 8;
  else base = character.pbScores[stat] ?? 8;
  return Number(base);
}

export function getAbilityScoreBonusBreakdown(character, stat) {
  const bonuses = [];
  const backgroundBonus = getBackgroundBonus(character, stat);
  if (backgroundBonus) bonuses.push({ source: 'Background', value: backgroundBonus });

  const asiBonus = getFeatAsiBonus(character, stat);
  if (asiBonus) bonuses.push({ source: 'Feat/ASI', value: asiBonus });

  return bonuses;
}

export function getAbilityScoreBonus(character, stat) {
  return getAbilityScoreBonusBreakdown(character, stat).reduce((sum, bonus) => sum + bonus.value, 0);
}

export function getFinalScore(character, stat) {
  return getBaseScore(character, stat) + getAbilityScoreBonus(character, stat);
}

export function getAllFinalScores(character) {
  return Object.fromEntries(STATS.map((stat) => [stat, getFinalScore(character, stat)]));
}

export function getHitDieFaces(classObject) {
  return classObject?.hd?.faces || classObject?.hd?.[0]?.faces || 8;
}

export function calcMaxHp(character) {
  if (!character?.className) return 0;
  return sharedComputeMaxHp(character, statMod(getFinalScore(character, 'con')));
}

export function getCasterProgression(className, classObject, subclassName) {
  const name = String(className || classObject?.name || '').toLowerCase();
  const explicit = classObject?.casterProgression;
  if (explicit === 'full' || explicit === 'half' || explicit === 'pact') return explicit;
  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(name)) return 'full';
  if (['paladin', 'ranger', 'artificer'].includes(name)) return name === 'artificer' ? 'artificer' : 'half';
  if (name === 'warlock') return 'pact';
  if (name === 'fighter' && String(subclassName || '').toLowerCase().includes('eldritch')) return 'third';
  if (name === 'rogue' && String(subclassName || '').toLowerCase().includes('arcane')) return 'third';
  return null;
}

export function getCasterContribution(progression, level) {
  if (progression === 'full') return level;
  if (progression === 'half') return Math.floor(level / 2);
  if (progression === 'artificer') return Math.ceil(level / 2);
  if (progression === 'third') return Math.floor(level / 3);
  return 0;
}

export function getSpellSlots(character) {
  const primaryLv = getPrimaryClassLevel(character);
  const primaryProg = getCasterProgression(character.className, character.cls, character.subclassShortName);
  const extras = character.extraClasses || [];
  const extraCasters = extras.filter((extra) => getCasterProgression(extra.name, extra.cls, extra.subclassShortName));
  const pactSlot = primaryProg === 'pact' ? PACT_SLOTS[primaryLv] : null;

  if (!extras.length) {
    if (primaryProg === 'full') return { slots: FULL_SLOTS[primaryLv] || [], pact: null };
    if (primaryProg === 'half') return { slots: HALF_SLOTS[primaryLv] || [], pact: null };
    if (primaryProg === 'artificer') return { slots: HALF_SLOTS[primaryLv] || [], pact: null };
    if (primaryProg === 'third') return { slots: THIRD_SLOTS[primaryLv] || [], pact: null };
    if (primaryProg === 'pact') return { slots: [], pact: pactSlot };
    return { slots: [], pact: null };
  }

  const casterLevel = getCasterContribution(primaryProg, primaryLv)
    + extraCasters.reduce((sum, extra) => sum + getCasterContribution(getCasterProgression(extra.name, extra.cls, extra.subclassShortName), extra.level || 1), 0);
  if (casterLevel > 0) return { slots: FULL_SLOTS[Math.min(20, casterLevel)] || [], pact: pactSlot };
  if (primaryProg === 'half' || primaryProg === 'artificer') return { slots: HALF_SLOTS[primaryLv] || [], pact: pactSlot };
  if (primaryProg === 'third') return { slots: THIRD_SLOTS[primaryLv] || [], pact: pactSlot };
  return { slots: [], pact: pactSlot };
}

export function getProficiencyBonus(level) {
  return PROFICIENCY_BONUS[level] || 2;
}

export function getPrimaryClassLevel(character) {
  const explicit = Number(character?.classLevel);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const total = Number(character?.level || 0) || 1;
  const extras = (character?.extraClasses || [])
    .filter((extra) => extra?.name)
    .reduce((sum, extra) => sum + (Number(extra.level) || 1), 0);
  return Math.max(1, total - extras);
}

export function getSelectedFeatNames(character) {
  return collectOwnedFeatNames(character);
}
