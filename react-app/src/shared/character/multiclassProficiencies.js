import { strip5eMarkup } from './spellEntries.js';

const ARMOR_LABELS = { light: 'Light armor', medium: 'Medium armor', heavy: 'Heavy armor', shield: 'Shields', shields: 'Shields' };
const WEAPON_LABELS = { simple: 'Simple weapons', martial: 'Martial weapons' };

function labelFrom(map, value) {
  return map[String(value).toLowerCase()] || String(value);
}

// Coerce a 5etools `proficienciesGained` field to an array (some are objects).
function toList(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

// One proficiency entry → display string, stripping 5etools inline markup
// (e.g. "{@item thieves' tools|PHB}" → "thieves' tools").
function toText(value) {
  if (value && typeof value === 'object') return strip5eMarkup(String(value.name || value.tool || '')).trim();
  return strip5eMarkup(String(value)).trim();
}

// Maps a `proficienciesGained` object to ordered, human-readable rows for display:
// [{ label: 'Armor', values: ['Light armor', ...] }, ...]. Empty array means the
// class grants no multiclass proficiencies. Pure data → presentation; no JSX.
export function describeMulticlassProficiencies(className, profs) {
  const skills = toList(profs?.skills).map((block) => {
    const count = Number(block?.choose?.count || block?.count || 1);
    return `Choose ${count} skill${count > 1 ? 's' : ''} from the ${className} list`;
  });
  return [
    ['Armor', toList(profs?.armor).map((value) => labelFrom(ARMOR_LABELS, toText(value) || value))],
    ['Weapons', toList(profs?.weapons).map((value) => labelFrom(WEAPON_LABELS, toText(value) || value))],
    ['Tools', toList(profs?.tools).map(toText).filter(Boolean)],
    ['Skills', skills],
  ].filter(([, values]) => values.length).map(([label, values]) => ({ label, values }));
}

const XPHB_MULTICLASS_FALLBACK = {
  Barbarian: {
    armor: ['shield'],
    weapons: ['martial'],
  },
  Bard: {
    armor: ['light'],
    tools: ['Choose one {@item Musical Instrument|XPHB}'],
    toolProficiencies: [{ anyMusicalInstrument: 1 }],
    skills: [{ choose: { from: 'classSkillList', count: 1 } }],
  },
  Cleric: {
    armor: ['light', 'medium', 'shield'],
  },
  Druid: {
    armor: ['light', 'shield'],
  },
  Fighter: {
    armor: ['light', 'medium', 'shield'],
    weapons: ['martial'],
  },
  Monk: {},
  Paladin: {
    armor: ['light', 'medium', 'shield'],
    weapons: ['martial'],
  },
  Ranger: {
    armor: ['light', 'medium', 'shield'],
    weapons: ['martial'],
    skills: [{ choose: { from: 'classSkillList', count: 1 } }],
  },
  Rogue: {
    armor: ['light'],
    tools: ["{@item Thieves' Tools|XPHB}"],
    toolProficiencies: [{ "thieves' tools": true }],
    skills: [{ choose: { from: 'classSkillList', count: 1 } }],
  },
  Sorcerer: {},
  Warlock: {
    armor: ['light'],
  },
  Wizard: {},
};

const MUSICAL_INSTRUMENTS = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Hand Drum', 'Horn', 'Lute', 'Lyre', 'Pan Flute', 'Shawm', 'Viol'];

function classKey(className) {
  return String(className || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fallbackForClass(className) {
  const wanted = classKey(className);
  return Object.entries(XPHB_MULTICLASS_FALLBACK).find(([name]) => classKey(name) === wanted)?.[1] || {};
}

export function isPrimaryClassContext(ctx = {}) {
  return !isMulticlassContext(ctx);
}

export function isMulticlassContext(ctx = {}) {
  return !!(ctx.isMulticlass || ctx.multiclass || ctx.keyPrefix || String(ctx.keyPrefix || '').startsWith('mc'));
}

export function getMulticlassProficiencies(className, cls = null) {
  return cls?.multiclassing?.proficienciesGained
    || cls?.multiclassProficienciesGained
    || fallbackForClass(className);
}

function classSkillList(cls) {
  const out = [];
  (cls?.startingProficiencies?.skills || []).forEach((block) => {
    const from = block?.choose?.from || [];
    if (Array.isArray(from)) out.push(...from);
  });
  return [...new Set(out)].filter(Boolean);
}

function choiceFromBlock(key, label, block, fallbackFrom = []) {
  if (!block || typeof block !== 'object') return null;
  const choose = block.choose;
  if (!choose) return null;
  let from = choose.from;
  if (from === 'classSkillList') from = fallbackFrom;
  if (!Array.isArray(from) || !from.length) from = fallbackFrom;
  const count = Number(choose.count || block.anyMusicalInstrument || block.any || 1);
  if (!from.length || !count) return null;
  return { key, label, type: 'generic_choice', from, count, level: 1 };
}

export function getMulticlassChoiceSpecs(className, keyPrefix = '', cls = null) {
  const profs = getMulticlassProficiencies(className, cls);
  const specs = [];

  (profs?.skills || []).forEach((block, index) => {
    const spec = choiceFromBlock(`${keyPrefix}mc_skill_${index}`, 'Multiclass Skill', block, classSkillList(cls));
    if (spec) specs.push({ ...spec, type: 'skill_choice' });
  });

  [...(profs?.toolProficiencies || [])].forEach((block, index) => {
    const spec = block?.anyMusicalInstrument
      ? { key: `${keyPrefix}mc_tool_${index}`, label: 'Multiclass Tool', type: 'generic_choice', from: MUSICAL_INSTRUMENTS, count: Number(block.anyMusicalInstrument || 1), level: 1 }
      : choiceFromBlock(`${keyPrefix}mc_tool_${index}`, 'Multiclass Tool', block, []);
    if (spec) specs.push(spec);
  });

  return specs;
}
