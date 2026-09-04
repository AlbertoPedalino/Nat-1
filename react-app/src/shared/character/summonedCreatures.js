const SUMMONED_CREATURE_DATA_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/bestiary-au.json';
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

let recordsPromise = null;

const clone = (value) => {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

export async function loadSummonedCreatureRecords() {
  if (recordsPromise) return recordsPromise;
  recordsPromise = (async () => {
    const response = await fetch(SUMMONED_CREATURE_DATA_URL);
    if (!response.ok) throw new Error(`bestiary-au.json: HTTP ${response.status}`);
    const data = await response.json();
    return (data.monster || []).filter((monster) => (
      monster?.summonedBySpell || monster?.summonedByClass || monster?.summonedByClassFeature
    ));
  })();
  recordsPromise.catch(() => { recordsPromise = null; });
  return recordsPromise;
}

export function findSummonedCreature(records, name, source = '') {
  const wantedName = String(name || '').trim().toLowerCase();
  const wantedSource = String(source || '').trim().toLowerCase();
  return (records || []).find((record) => (
    String(record?.name || '').trim().toLowerCase() === wantedName
    && (!wantedSource || String(record?.source || '').trim().toLowerCase() === wantedSource)
  )) || null;
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
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

function normalizeSpeed(speed) {
  if (typeof speed === 'number') return { walk: speed };
  if (!speed || typeof speed !== 'object') return {};
  const out = {};
  ['walk', 'fly', 'swim', 'climb', 'burrow'].forEach((key) => {
    const raw = speed[key];
    const value = typeof raw === 'object' ? Number(raw?.number) : Number(raw);
    if (Number.isFinite(value)) out[key] = value;
  });
  if (speed.canHover) out.hover = true;
  return out;
}

function sizeLabel(size) {
  const labels = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' };
  const key = asArray(size)[0];
  return labels[key] || key || '';
}

function typeLabel(type) {
  if (typeof type === 'string') return type;
  if (typeof type?.type === 'string') return type.type;
  const choices = type?.type?.choose || type?.choose;
  return Array.isArray(choices) ? choices.join('/') : '';
}

function resolveAc(ac, { spellLevel, abilityMod }) {
  const first = asArray(ac)[0];
  if (typeof first === 'number') return first;
  if (Number.isFinite(Number(first?.ac))) return Number(first.ac);
  const special = String(first?.special || '').trim();
  const base = Number(special.match(/^(\d+)/)?.[1]);
  if (Number.isFinite(base) && /spell's level/i.test(special)) return base + spellLevel;
  if (Number.isFinite(base) && /charisma modifier/i.test(special)) return base + abilityMod;
  return special || null;
}

function resolveHp(hp, { spellLevel, classLevel }) {
  if (Number.isFinite(Number(hp?.average))) {
    return { average: Number(hp.average), formula: String(hp.formula || '') };
  }
  const special = String(hp?.special || '').trim();
  const scaled = special.match(/^(\d+)\s*\+\s*(\d+)\s+for each spell level above\s+(\d+)/i);
  if (scaled) {
    const [, base, perLevel, minimum] = scaled.map(Number);
    return { average: base + perLevel * Math.max(0, spellLevel - minimum), formula: '' };
  }
  if (/^4\s*\+\s*four times your warlock level/i.test(special)) {
    return { average: 4 + (4 * classLevel), formula: `${classLevel}d6` };
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

function resolveEntryText(node, { spellLevel, spellAttackBonus, spellSaveDc, abilityMod }) {
  if (typeof node === 'string') {
    return node
      .replace(/\{@hitYourSpellAttack Bonus equals your spell attack modifier\}/gi, `{@hit ${spellAttackBonus}}`)
      .replace(/\{@damage ([^}]+)\}\s+plus your Charisma modifier/gi, (_, formula) => `{@damage ${formulaWithAbilityModifier(formula, abilityMod)}}`)
      .replace(/\{@dice ([^}]+)\}\s+plus your Charisma modifier/gi, (_, formula) => `{@dice ${formulaWithAbilityModifier(formula, abilityMod)}}`)
      .replace(/summonSpellLevel/g, String(spellLevel))
      .replace(/your spell save DC/gi, String(spellSaveDc));
  }
  if (Array.isArray(node)) return node.map((entry) => resolveEntryText(entry, { spellLevel, spellAttackBonus, spellSaveDc, abilityMod }));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [
      key,
      resolveEntryText(value, { spellLevel, spellAttackBonus, spellSaveDc, abilityMod }),
    ]));
  }
  return node;
}

export function normalizeSummonedCreature(record, options = {}) {
  if (!record) return null;
  const spellLevel = Math.max(0, Number(options.spellLevel || record.summonedBySpellLevel || 0));
  const classLevel = Math.max(0, Number(options.classLevel || 0));
  const abilityMod = Number(options.abilityMod || 0);
  const spellAttackBonus = Number(options.spellAttackBonus || 0);
  const spellSaveDc = Number(options.spellSaveDc || (8 + spellAttackBonus));
  const replacementContext = { spellLevel, spellAttackBonus, spellSaveDc, abilityMod };
  const abilities = {};
  ABILITIES.forEach((ability) => { abilities[ability] = Number(record[ability] ?? 10); });

  return {
    name: String(record.name || 'Summoned Creature'),
    source: String(record.source || ''),
    size: sizeLabel(record.size),
    type: String(options.creatureType || '').trim() || typeLabel(record.type),
    cr: null,
    ac: resolveAc(record.ac, { spellLevel, abilityMod }),
    hp: resolveHp(record.hp, { spellLevel, classLevel }),
    abilities,
    saves: {},
    skills: {},
    speed: normalizeSpeed(record.speed),
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
