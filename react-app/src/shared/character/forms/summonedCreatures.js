import { asArray } from '../../lists.js';
import { loadGameData } from '../../content/gameData.js';
import { ABILITIES, SKILLS, abilityKey, sizeName } from '../../content/rulesVocabulary.js';
import { abilityModifier } from '../progression/abilityModifier.js';
import { armorClassEntry, creatureSpeeds } from '../../bestiary/monsterUtils.js';
import { cachedLoader } from '../../content/cachedLoader.js';
// Bestiary files holding creatures a spell or class feature summons (their
// records carry `summonedBySpell` / `summonedByClass`). XPHB has the Ranger's
// primal beasts.
const SUMMONED_CREATURE_FILES = ['bestiary-au.json', 'bestiary-xphb.json'];
// The ability a stat block scales with is named in prose: "13 plus your Wisdom
// modifier", "{@damage 1d8 + 2} plus your Charisma modifier".
const ABILITY_NAME = '(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)';
const ABILITY_MODIFIER = new RegExp(`${ABILITY_NAME} modifier`, 'i');
const DAMAGE_PLUS_ABILITY = new RegExp(String.raw`\{@damage ([^}]+)\}\s*(?:plus|\+) your ${ABILITY_NAME} modifier`, 'gi');
const DICE_PLUS_ABILITY = new RegExp(String.raw`\{@dice ([^}]+)\}\s*(?:plus|\+) your ${ABILITY_NAME} modifier`, 'gi');
// "{@damage 1d8} … damage. This damage increases by {@damage 1d8} when you
// reach Druid levels 5 ({@damage 2d8}), 11 ({@damage 3d8}), and 17 (…)."
const LEVEL_SCALED_DAMAGE = /\{@damage ([^}]+)\}([^.]*?)\.(\s*(?:This|The extra) damage increases by \{@damage [^}]+\} when you reach \w+ levels ([^.]+?)\.)/gi;
const SKILL_ABILITIES = Object.fromEntries(SKILLS.map((skill) => [skill.name.toLowerCase().replace(/[^a-z]/g, ''), skill.ability]));
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

const clone = (value) => {
  if (value == null) return value;
  return structuredClone(value);
};

export const loadSummonedCreatureRecords = cachedLoader(async () => {
  const files = await Promise.all(SUMMONED_CREATURE_FILES.map((file) => loadGameData(`bestiary/${file}`)));
  return files.flatMap((data) => (data.monster || []).filter((monster) => (
    monster?.summonedBySpell || monster?.summonedByClass || monster?.summonedByClassFeature
  )));
});

export function findSummonedCreature(records, name, source = '') {
  const wantedName = String(name || '').trim().toLowerCase();
  const wantedSource = String(source || '').trim().toLowerCase();
  return (records || []).find((record) => (
    String(record?.name || '').trim().toLowerCase() === wantedName
    && (!wantedSource || String(record?.source || '').trim().toLowerCase() === wantedSource)
  )) || null;
}

function applyArrayMod(value, mod) {
  const current = Array.isArray(value) ? value.slice() : [];
  const names = new Set(asArray(mod?.names).map((name) => String(name).toLowerCase()));
  if (mod?.mode === 'removeArr') {
    return current.filter((entry) => !names.has(String(entry?.name || '').toLowerCase()));
  }
  if (mod?.mode === 'renameArr') {
    const rename = mod.renames?.rename;
    const replacement = mod.renames?.with;
    return current.map((entry) => (
      entry?.name === rename ? { ...entry, name: replacement } : entry
    ));
  }
  if (mod?.mode === 'replaceArr') {
    const items = asArray(mod.items);
    const index = current.findIndex((entry) => entry?.name === mod.replace);
    if (index < 0) return [...current, ...items];
    return [...current.slice(0, index), ...items, ...current.slice(index + 1)];
  }
  if (mod?.mode === 'appendArr') return [...current, ...asArray(mod.items)];
  if (mod?.mode === 'prependArr') return [...asArray(mod.items), ...current];
  return current;
}

export function applySummonedCreatureVersion(baseRecord, version) {
  if (!baseRecord || !version) return clone(baseRecord);
  const patch = clone(version);
  const mods = patch._mod || {};
  delete patch._mod;
  const resolved = { ...clone(baseRecord), ...patch };
  delete resolved._versions;
  Object.entries(mods).forEach(([property, rawMods]) => {
    let value = resolved[property];
    asArray(rawMods).forEach((mod) => { value = applyArrayMod(value, mod); });
    resolved[property] = value;
  });
  return resolved;
}

export function getSummonedCreatureVersions(record) {
  if (!record) return [];
  const versions = asArray(record._versions);
  if (!versions.length) return [{ name: record.name, record: clone(record) }];
  return versions.map((version) => ({
    name: version.name,
    record: applySummonedCreatureVersion(record, version),
  }));
}

export function getSummonedCreatureTypeChoices(record) {
  const choices = record?.type?.type?.choose || record?.type?.choose;
  if (!Array.isArray(choices)) return [];
  return choices.map((choice) => String(choice || '').trim()).filter(Boolean);
}

function typeLabel(type) {
  if (typeof type === 'string') return type;
  if (typeof type?.type === 'string') return type.type;
  const choices = type?.type?.choose || type?.choose;
  return Array.isArray(choices) ? choices.join('/') : '';
}

function resolveAc(ac, { spellLevel, abilityMod }) {
  const { value, special } = armorClassEntry(ac);
  if (value != null) return value;
  const base = Number(special.match(/^(\d+)/)?.[1]);
  if (Number.isFinite(base) && /spell's level/i.test(special)) return base + spellLevel;
  if (Number.isFinite(base) && ABILITY_MODIFIER.test(special)) return base + abilityMod;
  return special || null;
}

function resolveHp(hp, { spellLevel, classLevel }) {
  if (Number.isFinite(Number(hp?.average))) {
    return { average: Number(hp.average), formula: String(hp.formula || '') };
  }
  const special = String(hp?.special || '').trim();
  // "3 times your Druid level" (a Wild Shape form's Temporary Hit Points).
  const timesClassLevel = special.match(/^(\w+)\s+times your \w+ level$/i);
  if (timesClassLevel) {
    const per = NUMBER_WORDS[timesClassLevel[1].toLowerCase()] ?? Number(timesClassLevel[1]);
    if (Number.isFinite(per)) return { average: per * classLevel, formula: '', temporary: Boolean(hp?.isTemporary) };
  }
  const scaled = special.match(/^(\d+)\s*\+\s*(\d+)\s+for each spell level above\s+(\d+)/i);
  if (scaled) {
    const [, base, perLevel, minimum] = scaled.map(Number);
    return { average: base + perLevel * Math.max(0, spellLevel - minimum), formula: '' };
  }
  if (/^4\s*\+\s*four times your warlock level/i.test(special)) {
    return { average: 4 + (4 * classLevel), formula: `${classLevel}d6` };
  }
  // "5 plus five times your Ranger level (… Hit Dice [d8s] equal to your Ranger level)"
  const perClassLevel = special.match(/^(\d+)\s*(?:\+|plus)\s*(\w+)\s+times your \w+ level/i);
  if (perClassLevel) {
    const per = NUMBER_WORDS[perClassLevel[2].toLowerCase()] ?? Number(perClassLevel[2]);
    if (Number.isFinite(per)) {
      const hitDie = special.match(/\[d(\d+)s?\]/i)?.[1];
      return {
        average: Number(perClassLevel[1]) + per * classLevel,
        formula: hitDie && classLevel ? `${classLevel}d${hitDie}` : '',
      };
    }
  }
  return { average: special || 1, formula: '' };
}

function flattenDamageList(value, property) {
  return asArray(value).flatMap((entry) => {
    if (typeof entry === 'string') return [entry];
    const items = asArray(entry?.[property]);
    return items.map((item) => `${item}${entry.note ? ` ${entry.note}` : ''}`);
  });
}

function formulaWithAbilityModifier(formula, abilityMod) {
  const modifier = Number(abilityMod) || 0;
  const base = String(formula || '').trim();
  if (!modifier) return base;
  const trailingModifier = base.match(/^(.*?)([+-])\s*(\d+)\s*$/);
  if (trailingModifier && /\d*d\d+/i.test(trailingModifier[1])) {
    const existing = Number(trailingModifier[3]) * (trailingModifier[2] === '-' ? -1 : 1);
    const combined = existing + modifier;
    const dice = trailingModifier[1].trim();
    if (!combined) return dice;
    return `${dice} ${combined > 0 ? '+' : '-'} ${Math.abs(combined)}`;
  }
  return `${base} ${modifier > 0 ? '+' : '-'} ${Math.abs(modifier)}`;
}

// The damage dice at a class level, from the sentence that lists them.
function scaleDamageByLevel(text, classLevel) {
  return text.replace(LEVEL_SCALED_DAMAGE, (match, base, rest, increase, steps) => {
    let dice = base;
    for (const [, level, formula] of steps.matchAll(/(\d+)\s*\(\{@damage ([^}]+)\}\)/g)) {
      if (classLevel >= Number(level)) dice = formula;
    }
    return `{@damage ${dice}}${rest}.${increase}`;
  });
}

function resolveEntryText(node, context) {
  const { spellLevel, spellAttackBonus, spellSaveDc, abilityMod, classLevel = 0 } = context;
  if (typeof node === 'string') {
    return scaleDamageByLevel(node, classLevel)
      .replace(/\{@hitYourSpellAttack Bonus equals your spell attack modifier\}/gi, `{@hit ${spellAttackBonus}}`)
      .replace(DAMAGE_PLUS_ABILITY, (_, formula) => `{@damage ${formulaWithAbilityModifier(formula, abilityMod)}}`)
      .replace(DICE_PLUS_ABILITY, (_, formula) => `{@dice ${formulaWithAbilityModifier(formula, abilityMod)}}`)
      .replace(/summonSpellLevel/g, String(spellLevel))
      .replace(/your spell save DC/gi, String(spellSaveDc));
  }
  if (Array.isArray(node)) return node.map((entry) => resolveEntryText(entry, context));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, resolveEntryText(value, context)]));
  }
  return node;
}

// An ability score a form states as a rule: "equal to your Wisdom score",
// "… don't change" (your own). `scores` are the character's.
function resolveAbilityScore(value, ability, scores) {
  if (Number.isFinite(Number(value))) return Number(value);
  const special = String(value?.special || '');
  const equal = special.match(new RegExp(`equal to your (${ABILITY_NAME}) score`, 'i'));
  if (equal && scores) return Number(scores[abilityKey(equal[1])] ?? 10);
  if (/don't change/i.test(special) && scores) return Number(scores[ability] ?? 10);
  return 10;
}

// Skills a form states as a rule ("You have proficiency in {@skill Stealth}"):
// the form's modifier plus the Proficiency Bonus.
function resolveSkills(skill, abilities, proficiencyBonus) {
  const special = String(skill?.special || '');
  const out = {};
  [...special.matchAll(/\{@skill ([^}|]+)/gi)].forEach(([, name]) => {
    const key = name.toLowerCase().replace(/[^a-z]/g, '');
    const ability = SKILL_ABILITIES[key];
    if (ability) out[key] = abilityModifier(abilities[ability]) + Number(proficiencyBonus || 0);
  });
  return out;
}

export function normalizeSummonedCreature(record, options = {}) {
  if (!record) return null;
  const spellLevel = Math.max(0, Number(options.spellLevel || record.summonedBySpellLevel || 0));
  const classLevel = Math.max(0, Number(options.classLevel || 0));
  const abilityMod = Number(options.abilityMod || 0);
  const spellAttackBonus = Number(options.spellAttackBonus || 0);
  const spellSaveDc = Number(options.spellSaveDc || (8 + spellAttackBonus));
  const replacementContext = { spellLevel, spellAttackBonus, spellSaveDc, abilityMod, classLevel };
  const abilities = {};
  ABILITIES.forEach((ability) => { abilities[ability] = resolveAbilityScore(record[ability], ability, options.abilityScores); });

  return {
    name: String(record.name || 'Summoned Creature'),
    source: String(record.source || ''),
    size: sizeName(record.size),
    type: String(options.creatureType || '').trim() || typeLabel(record.type),
    cr: null,
    ac: resolveAc(record.ac, { spellLevel, abilityMod }),
    hp: resolveHp(record.hp, { spellLevel, classLevel }),
    abilities,
    saves: {},
    skills: resolveSkills(record.skill, abilities, options.proficiencyBonus),
    speed: creatureSpeeds(record.speed),
    senses: asArray(record.senses),
    passivePerception: Number(record.passive) || null,
    vulnerable: flattenDamageList(record.vulnerable, 'vulnerable'),
    resist: flattenDamageList(record.resist, 'resist'),
    immune: flattenDamageList(record.immune, 'immune'),
    conditionImmune: flattenDamageList(record.conditionImmune, 'conditionImmune'),
    languages: asArray(record.languages),
    traits: resolveEntryText(asArray(record.trait), replacementContext),
    actions: resolveEntryText(asArray(record.action), replacementContext),
    bonusActions: resolveEntryText(asArray(record.bonus), replacementContext),
    reactions: resolveEntryText(asArray(record.reaction), replacementContext),
    proficiencyNote: String(record.pbNote || ''),
    spellLevel,
  };
}
