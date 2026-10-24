// The supported manuals and adventures, as books to read and search.
//
// A book file (data/book/book-<id>.json, data/adventure/adventure-<id>.json)
// is a list of chapters; each is turned into the text blocks the rest of the
// app renders (entriesToTextBlocks) and split into sections at its top-level
// headings, so the contents can point at a section and a search hit can land
// on one. Pictures come along, from the 5etools image mirror the battle map
// already uses for tokens.
//
// The 2024 books carry much of their text by reference: a chapter of spells is
// a list of {type: 'statblock', tag: 'spell', name, source}, the rules glossary
// one of variant rules, the Monster Manual its creatures and their lore. Those
// are resolved before the text is built — from the compendium for what it
// holds, from the data file of the kind for the rest — the way 5etools shows
// them. A reference nothing resolves (a whole class) stays a pointer.

import { getJson } from '../encounterbuilder/bestiary/bestiary.js';
import { entriesToTextBlocks } from '../../shared/character/spells/spellEntries.js';
import { normalizeSearchText } from '../../shared/content/searchText.js';
import { CORE_2024_SOURCE_PRIORITY } from '../../shared/content/sourcePriority.js';
import {
  abilityModString,
  crPB,
  crXP,
  formatAlignment,
  formatDamageList,
  formatMod,
  formatNumber,
  formatSpeed,
  getAC,
  getACDesc,
  getCR,
  getSizeLabel,
  getType,
  getTypeTags,
} from '../encounterbuilder/bestiary/monsterUtils.js';
import { IMAGE_BASE } from '../encounterbuilder/state/constants.js';

const imageUrl = (path) => `${IMAGE_BASE}${String(path).replace(/^\/+/, '')}`;

// The player manuals, plus the 2024 Monster Manual: a book worth reading even
// though the builder does not draw player options from it.
export const BOOK_IDS = Object.freeze([...new Set([...CORE_2024_SOURCE_PRIORITY, 'XMM'])]);

export function toBookList(booksJson, adventuresJson) {
  const pick = (list, kind) => (Array.isArray(list) ? list : [])
    .filter((entry) => BOOK_IDS.includes(entry?.id))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      kind,
      published: entry.published || '',
      file: `${kind}/${kind}-${String(entry.id).toLowerCase()}.json`,
    }));
  return [...pick(booksJson?.book, 'book'), ...pick(adventuresJson?.adventure, 'adventure')]
    .sort((a, b) => a.published.localeCompare(b.published) || a.name.localeCompare(b.name));
}

export async function loadBookList() {
  const [books, adventures] = await Promise.all([
    getJson('books.json'),
    getJson('adventures.json').catch(() => ({ adventure: [] })),
  ]);
  return toBookList(books, adventures);
}

function blockText(block) {
  if (block.kind === 'image') return block.title || '';
  if (block.kind === 'table') {
    return [block.caption, ...(block.headers || []), ...(block.rows || []).flat()].filter(Boolean).join(' ');
  }
  return block.text || '';
}

// Chapters -> { index, name, sections: [{ index, name, blocks }] }. A chapter's
// opening text, before its first heading, is a section named after it.
export function bookChapters(data) {
  return (Array.isArray(data) ? data : []).map((chapter, index) => {
    const name = String(chapter?.name || `Part ${index + 1}`);
    const blocks = entriesToTextBlocks(chapter?.entries || [], { imageUrl, boxes: true });
    const sections = [];
    let current = { name, blocks: [] };
    // A sidebar's own title is not a section of the chapter.
    let inBox = 0;
    for (const block of blocks) {
      if (block.kind === 'boxStart') inBox += 1;
      if (block.kind === 'boxEnd') inBox = Math.max(0, inBox - 1);
      if (block.kind === 'heading' && !block.depth && !inBox) {
        // A chapter that opens on a heading has no text of its own before it:
        // its first section is that heading's.
        if (current.blocks.length) sections.push(current);
        current = { name: block.text, blocks: [] };
      }
      current.blocks.push(block);
    }
    if (current.blocks.length || !sections.length) sections.push(current);
    return {
      index,
      name,
      sections: sections.map((section, sectionIndex) => ({ ...section, index: sectionIndex })),
    };
  });
}

// Book reference tags held by the compendium, as its kinds.
export const COMPENDIUM_TAGS = Object.freeze({
  spell: 'spell',
  feat: 'feat',
  background: 'background',
  race: 'species',
  condition: 'condition',
  variantrule: 'rule',
  action: 'action',
  creature: 'monster',
  item: 'item',
});

// The rest, from the data file of the kind: [file, list key].
export const REFERENCE_FILES = Object.freeze({
  disease: ['conditionsdiseases.json', 'disease'],
  status: ['conditionsdiseases.json', 'status'],
  trap: ['trapshazards.json', 'trap'],
  hazard: ['trapshazards.json', 'hazard'],
  sense: ['senses.json', 'sense'],
  facility: ['bastions.json', 'facility'],
  object: ['objects.json', 'object'],
  reward: ['rewards.json', 'reward'],
  optfeature: ['optionalfeatures.json', 'optionalfeature'],
  table: ['tables.json', 'table'],
  vehicle: ['vehicles.json', 'vehicle'],
});

function referenceKey(name, source) {
  return `${normalizeSearchText(name)}|${String(source || '').toLowerCase()}`;
}

function isReference(node) {
  return Boolean(node) && typeof node === 'object'
    && (node.type === 'statblock' || node.type === 'statblockInline')
    && typeof node.name === 'string';
}

// What a book refers to that is not in the compendium: kinds by tag, the
// sources whose monster lore it shows, the classes whose file it needs (and
// which of them it also lists subclass by subclass), and whether it names
// items (some are generic variants or groups the compendium lists only as
// their concrete members).
export function bookReferenceNeeds(data, lookup = null) {
  const tags = new Set();
  const fluffSources = new Set();
  const classNames = new Set();
  const subclassClasses = new Set();
  // Creatures the compendium does not hold (a summon has no Challenge Rating
  // and is no encounter monster), read from their bestiary file instead.
  const creatureSources = new Set();
  let items = false;
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    if (isReference(node)) {
      if (node.prop === 'monsterFluff') fluffSources.add(String(node.source || '').toLowerCase());
      else if (node.tag === 'creature') {
        if (!lookup?.('monster', node.name, node.source) && node.source) creatureSources.add(node.source);
      } else if (REFERENCE_FILES[node.tag]) tags.add(node.tag);
      else if (node.tag === 'class') classNames.add(node.name.toLowerCase());
      else if (node.tag === 'subclass' && node.className) {
        classNames.add(String(node.className).toLowerCase());
        subclassClasses.add(String(node.className).toLowerCase());
      } else if (node.tag === 'item') items = true;
      return;
    }
    Object.values(node).forEach(walk);
  };
  walk(data);
  return {
    tags: [...tags],
    fluffSources: [...fluffSources].filter(Boolean),
    classNames: [...classNames],
    subclassClasses: [...subclassClasses],
    creatureSources: [...creatureSources],
    items,
  };
}

// An encounter table ({diceExpression, table: [{min, max, result}]}) as a table.
function encounterTable(table, caption) {
  return {
    type: 'table',
    caption: table.caption || caption || '',
    colLabels: [table.diceExpression || 'Roll', 'Encounter'],
    rows: (table.table || []).map((row) => [
      row.min === row.max ? String(row.min) : `${row.min}–${row.max}`,
      row.result || '',
    ]),
  };
}

// tag -> Map(name|source -> record); 'monsterFluff' for the lore, 'classes'
// (lower-case name -> class file), 'itemFallback' for variant and group items,
// 'subclassClasses'. A file that fails to load leaves its references as
// pointers.
export async function loadReferenceTables({
  tags = [], fluffSources = [], classNames = [], subclassClasses = [], creatureSources = [], items = false,
}, lookup = null) {
  const tables = { subclassClasses: new Set(subclassClasses) };
  const loadTag = async (tag) => {
    const [file, key] = REFERENCE_FILES[tag];
    const json = await getJson(file).catch(() => null);
    tables[tag] = new Map((json?.[key] || []).map((record) => [referenceKey(record.name, record.source), record]));
    // Random encounter tables live in encounters.json, grouped under one
    // record whose tables carry their own captions.
    if (tag === 'table') {
      const encounters = await getJson('encounters.json').catch(() => null);
      (encounters?.encounter || []).forEach((record) => {
        const list = Array.isArray(record.tables) ? record.tables : [];
        list.forEach((table) => {
          if (table.caption) tables.table.set(referenceKey(table.caption, record.source), encounterTable(table));
        });
        if (list.length === 1) tables.table.set(referenceKey(record.name, record.source), encounterTable(list[0], record.name));
      });
    }
  };
  const loadCreatures = async (sources) => {
    const creatures = new Map();
    if (sources.length) {
      const index = await getJson('bestiary/index.json').catch(() => null);
      await Promise.all(sources.map(async (source) => {
        const file = index?.[source];
        const json = file ? await getJson(String(file).startsWith('bestiary/') ? file : `bestiary/${file}`).catch(() => null) : null;
        (json?.monster || []).forEach((record) => creatures.set(referenceKey(record.name, record.source), record));
      }));
    }
    tables.creatures = creatures;
  };
  const loadLore = async () => {
    const lore = new Map();
    await Promise.all(fluffSources.map(async (source) => {
      const json = await getJson(`bestiary/fluff-bestiary-${source}.json`).catch(() => null);
      (json?.monsterFluff || []).forEach((record) => lore.set(referenceKey(record.name, record.source), record));
    }));
    tables.monsterFluff = lore;
  };
  const loadClasses = async () => {
    const classes = new Map();
    if (classNames.length) {
      const index = await getJson('class/index.json').catch(() => null);
      await Promise.all(classNames.map(async (name) => {
        const file = index?.[name];
        const json = file ? await getJson(`class/${file}`).catch(() => null) : null;
        if (json) classes.set(name, json);
      }));
    }
    tables.classes = classes;
  };
  const loadItemFallback = async () => {
    const fallback = new Map();
    if (items) {
      const [variants, groups] = await Promise.all([
        getJson('magicvariants.json').catch(() => null),
        getJson('items.json').catch(() => null),
      ]);
      (variants?.magicvariant || []).forEach((variant) => {
        fallback.set(referenceKey(variant.name, variant.inherits?.source || variant.source), variant);
      });
      // A group (Bag of Tricks, Spell Scroll…) has no text of its own: its
      // members carry it, and the first one with any speaks for the group.
      // Members are items or, for armor and weapons, magic variants.
      const members = new Map((groups?.item || []).map((item) => [referenceKey(item.name, item.source), item]));
      (variants?.magicvariant || []).forEach((variant) => {
        const key = referenceKey(variant.name, variant.inherits?.source || variant.source);
        if (!members.has(key)) members.set(key, { name: variant.name, entries: variantEntries(variant) });
      });
      (groups?.itemGroup || []).forEach((group) => {
        const list = (group.items || []).map((ref) => {
          const [name, source] = String(ref).split('|');
          return members.get(referenceKey(name, source || group.source));
        }).filter(Boolean);
        // A member may copy its text from another item ({_copy: {name, source}}).
        const textOf = (item, depth = 0) => {
          if (Array.isArray(item?.entries) && item.entries.length) return item.entries;
          const copy = item?._copy;
          return copy && depth < 3 ? textOf(members.get(referenceKey(copy.name, copy.source)), depth + 1) : null;
        };
        const voice = list.map((item) => textOf(item)).find(Boolean);
        const entries = group.entries?.length ? group.entries : [
          list.length ? `{@i Comes as: ${list.map((item) => item.name).join(', ')}.}` : '',
          ...(voice || []),
        ].filter(Boolean);
        fallback.set(referenceKey(group.name, group.source), { ...group, entries });
      });
    }
    tables.itemFallback = fallback;
  };
  await Promise.all([...tags.map(loadTag), loadLore(), loadClasses(), loadItemFallback()]);
  // A class feature can name a creature too (a warlock's summoned companion):
  // those sources are known only once the class files are in.
  const fromClasses = [...tables.classes.values()].map((json) => bookReferenceNeeds(
    [json.classFeature, json.subclassFeature],
    lookup,
  ).creatureSources);
  await loadCreatures([...new Set([...creatureSources, ...fromClasses.flat()])]);
  return tables;
}

// A generic magic variant's text fills its {=bonusAc}-style blanks from what it
// gives its items.
function variantEntries(variant) {
  const inherits = variant.inherits || {};
  const fill = (node) => {
    if (typeof node === 'string') {
      return node.replace(/\{=(\w+)(?:\/\w+)?\}/g, (match, key) => (inherits[key] != null ? String(inherits[key]) : match));
    }
    if (Array.isArray(node)) return node.map(fill);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, fill(value)]));
    }
    return node;
  };
  return fill(inherits.entries || variant.entries || []);
}

const ABILITY_NAMES = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

function abilityList(attributes) {
  const names = (Array.isArray(attributes) ? attributes : []).map((key) => ABILITY_NAMES[key] || key);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : (names[0] || 'spellcasting ability');
}

function classTableCell(cell) {
  if (cell == null) return '—';
  if (typeof cell === 'number') return cell === 0 ? '—' : String(cell);
  if (typeof cell === 'string') return cell;
  if (cell.type === 'bonus') return `+${cell.value}`;
  if (cell.type === 'bonusSpeed') return `+${cell.value} ft.`;
  if (cell.type === 'dice') {
    return (cell.toRoll || []).map((die) => `${die.number || 1}d${die.faces}`).join(' + ') || '—';
  }
  if (cell.type === 'cell') return classTableCell(cell.entry);
  return '—';
}

function featureRef(entry) {
  const text = typeof entry === 'string' ? entry : entry?.classFeature;
  const [name, className, classSource, level, source] = String(text || '').split('|');
  return name ? { name, className, classSource: classSource || 'PHB', level: Number(level) || 0, source } : null;
}

const levelFeature = (feature) => ({ type: 'entries', name: `Level ${feature.level}: ${feature.name}`, entries: feature.entries || [] });

function subclassNode(json, subclass) {
  const features = (json.subclassFeature || [])
    .filter((feature) => feature.className === subclass.className && feature.classSource === subclass.classSource
      && feature.subclassShortName === subclass.shortName && feature.subclassSource === subclass.source)
    .sort((a, b) => a.level - b.level);
  return {
    type: 'entries',
    name: subclass.name,
    entries: features.map((feature) => (feature.name === subclass.name
      ? { type: 'entries', entries: feature.entries || [] }
      : levelFeature(feature))),
  };
}

// A class as the book shows it: its table, its features in level order and,
// unless the book lists them one by one, its subclasses from this book.
function classNode(json, node, { withSubclasses = true } = {}) {
  const cls = (json.class || []).find((entry) => entry.name === node.name && entry.source === node.source);
  if (!cls) return null;
  const features = (cls.classFeatures || []).map(featureRef).filter(Boolean)
    .map((ref) => (json.classFeature || []).find((feature) => feature.name === ref.name
      && feature.className === cls.name && feature.classSource === cls.source && feature.level === ref.level))
    .filter(Boolean);
  const groups = Array.isArray(cls.classTableGroups) ? cls.classTableGroups : [];
  const table = {
    type: 'table',
    caption: `The ${cls.name}`,
    colLabels: ['Level', 'Proficiency Bonus', 'Class Features', ...groups.flatMap((group) => group.colLabels || [])],
    rows: Array.from({ length: 20 }, (_, index) => [
      String(index + 1),
      `+${Math.ceil((index + 1) / 4) + 1}`,
      features.filter((feature) => feature.level === index + 1).map((feature) => feature.name).join(', ') || '—',
      ...groups.flatMap((group) => (group.rows || group.rowsSpellProgression || [])[index]?.map(classTableCell)
        || (group.colLabels || []).map(() => '—')),
    ]),
  };
  const facts = [
    cls.hd?.faces ? `Hit Point Die: d${cls.hd.faces} per ${cls.name} level` : '',
    Array.isArray(cls.primaryAbility) && cls.primaryAbility.length
      ? `Primary Ability: ${cls.primaryAbility.map((choice) => abilityList(Object.keys(choice))).join(' or ')}`
      : '',
  ].filter(Boolean).join('; ');
  const subclasses = withSubclasses
    ? (json.subclass || []).filter((subclass) => subclass.className === cls.name
      && subclass.classSource === cls.source && subclass.source === node.source)
    : [];
  return {
    type: 'entries',
    name: cls.name,
    entries: [facts, table, ...features.map(levelFeature), ...subclasses.map((subclass) => subclassNode(json, subclass))]
      .filter(Boolean),
  };
}

const MONSTER_SECTIONS = [
  ['trait', null],
  ['action', 'Actions'],
  ['bonus', 'Bonus Actions'],
  ['reaction', 'Reactions'],
  ['legendary', 'Legendary Actions'],
];

const SCORES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function capitalizeWord(text) {
  const value = String(text || '');
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// {dex: '+4', perception: '+3'} -> "Dexterity +4, Perception +3".
function bonusList(map) {
  return Object.entries(map || {})
    .filter(([, value]) => value != null && typeof value !== 'object')
    .map(([key, value]) => `${ABILITY_NAMES[key] || key.replace(/\b\w/g, (c) => c.toUpperCase())} ${value}`)
    .join(', ');
}

// A spellcasting entry as text: its header, then the spells by frequency.
function spellcastingNode(entry) {
  const hidden = entry.hidden || [];
  const lines = [];
  if (entry.will && !hidden.includes('will')) lines.push(`{@i At will:} ${entry.will.join(', ')}`);
  Object.entries(entry.daily && !hidden.includes('daily') ? entry.daily : {}).forEach(([key, value]) => {
    const label = key.includes('e') ? key.replace('e', '/day each') : `${key}/day`;
    lines.push(`{@i ${label}:} ${(Array.isArray(value) ? value : value?.spells || []).join(', ')}`);
  });
  Object.entries(entry.spells && !hidden.includes('spells') ? entry.spells : {}).forEach(([key, value]) => {
    const label = key === '0' ? 'Cantrips' : `Level ${key}${value?.slots ? ` (${value.slots} slots)` : ''}`;
    lines.push(`{@i ${label}:} ${(value?.spells || []).join(', ')}`);
  });
  return { type: 'entries', name: entry.name || 'Spellcasting', entries: [...(entry.headerEntries || []), ...lines, ...(entry.footerEntries || [])] };
}

// A creature's whole stat block, as text: the same parts, in the same order, as
// the encounter builder's stat block (without its rollers).
function monsterEntries(monster) {
  const cr = getCR(monster.cr);
  const line = (label, value) => (value ? `{@b ${label}} ${value}` : '');
  const out = [
    `{@i ${[getSizeLabel(monster), `${capitalizeWord(getType(monster.type))}${getTypeTags(monster.type)}`].filter(Boolean).join(' ')}${formatAlignment(monster.alignment) ? `, ${formatAlignment(monster.alignment)}` : ''}}`,
    line('Armor Class', `${getAC(monster.ac)}${getACDesc(monster.ac)}`),
    line('Hit Points', monster.hp?.average != null ? `${monster.hp.average}${monster.hp.formula ? ` (${monster.hp.formula})` : ''}` : monster.hp?.special),
    line('Speed', formatSpeed(monster.speed)),
    {
      type: 'table',
      colLabels: SCORES.map((key) => key.toUpperCase()),
      rows: [SCORES.map((key) => `${monster[key] ?? 10} (${abilityModString(monster[key])})`)],
    },
    line('Saving Throws', bonusList(monster.save)),
    line('Skills', bonusList(monster.skill)),
    line('Damage Vulnerabilities', formatDamageList(monster.vulnerable, 'vulnerable')),
    line('Damage Resistances', formatDamageList(monster.resist, 'resist')),
    line('Damage Immunities', formatDamageList(monster.immune, 'immune')),
    line('Condition Immunities', formatDamageList(monster.conditionImmune, 'conditionImmune')),
    line('Senses', [...(monster.senses || []), monster.passive != null ? `Passive Perception ${monster.passive}` : ''].filter(Boolean).join(', ')),
    line('Languages', Array.isArray(monster.languages) ? monster.languages.join(', ') : monster.languages || '—'),
    line('Challenge', `${cr}${crXP(cr) ? ` (XP ${formatNumber(crXP(cr))}; PB ${monster.pbNote || formatMod(crPB(cr))})` : ''}`),
  ];
  const spellcasting = Array.isArray(monster.spellcasting) ? monster.spellcasting : [];
  for (const [key, title] of MONSTER_SECTIONS) {
    const list = [
      ...(Array.isArray(monster[key]) ? monster[key] : []),
      ...spellcasting.filter((entry) => (entry.displayAs || 'trait') === key).map(spellcastingNode),
    ];
    if (!list.length) continue;
    if (title) out.push({ type: 'entries', name: title, entries: list });
    else out.push(...list);
  }
  return out.filter(Boolean);
}

// A vehicle has stats rather than text: its capacity, speed and hull, then its
// weapons, stations and actions as named parts.
function vehicleEntries(vehicle) {
  const speed = Object.entries(vehicle.speed || {})
    .filter(([, value]) => value && typeof value === 'object' && value.number != null)
    .map(([mode, value]) => `${mode} ${value.number} ft.${value.condition ? ` ${value.condition.replace(/[[\]]/g, '')}` : ''}`)
    .join(', ');
  const hull = vehicle.hull || {};
  const facts = [
    [vehicle.capCrew != null ? `Crew ${vehicle.capCrew}` : '', vehicle.capPassenger != null ? `Passengers ${vehicle.capPassenger}` : '',
      vehicle.capCargo != null ? `Cargo ${vehicle.capCargo} tons` : ''].filter(Boolean).join(' · '),
    speed ? `Speed: ${speed}` : '',
    [hull.ac != null ? `AC ${hull.ac}` : '', hull.hp != null ? `HP ${hull.hp}` : '', hull.dt != null ? `Damage Threshold ${hull.dt}` : '']
      .filter(Boolean).join(' · '),
  ].filter(Boolean);
  const parts = ['trait', 'action', 'weapon', 'station', 'other'].flatMap((key) => (Array.isArray(vehicle[key]) ? vehicle[key] : []))
    .map((part) => ({
      type: 'entries',
      name: part.count > 1 ? `${part.name} (${part.count})` : part.name,
      entries: [
        [part.ac != null ? `AC ${part.ac}` : '', part.hp != null ? `HP ${part.hp}` : '', part.crew != null ? `Crew ${part.crew}` : '']
          .filter(Boolean).join(' · '),
        ...(part.entries || []),
        ...(part.action || []),
      ].filter(Boolean),
    }));
  return [...facts, ...(vehicle.entries || []), ...parts];
}

function spellEntries(spell, subtitle) {
  const facts = [
    spell.castingTimeLabel ? `Casting Time: ${spell.castingTimeLabel}` : '',
    spell.rangeLabel ? `Range: ${spell.rangeLabel}` : '',
    spell.componentsLabel ? `Components: ${spell.componentsLabel}${spell.materialLabel ? ` (${spell.materialLabel})` : ''}` : '',
    spell.durationLabel ? `Duration: ${spell.durationLabel}` : '',
  ].filter(Boolean).join('; ');
  return [
    subtitle ? `{@i ${subtitle}}` : '',
    facts,
    ...(spell.descriptionEntries || spell.entries || []),
    ...(spell.higherLevelEntries || []),
  ].filter(Boolean);
}

const REFERENCE_LABELS = Object.freeze({
  variantrule: 'rule',
  race: 'species',
  creature: 'creature',
  optfeature: 'option',
  facility: 'bastion facility',
});

function referenceLabel(tag) {
  return REFERENCE_LABELS[tag] || String(tag || 'entry');
}

// The text a reference stands for, a pointer when nothing holds it, or null
// for lore the files do not have.
export function referenceNode(node, { lookup = null, tables = {} } = {}) {
  if (node.prop === 'monsterFluff') {
    const lore = tables.monsterFluff?.get(referenceKey(node.name, node.source));
    // The creature's portrait heads its lore, as in the book.
    const portrait = Array.isArray(lore?.images) ? lore.images.slice(0, 1) : [];
    return lore?.entries ? { type: 'entries', entries: [...portrait, ...lore.entries] } : null;
  }
  if (node.tag === 'class' || node.tag === 'subclass') {
    const className = String(node.tag === 'class' ? node.name : node.className || '').toLowerCase();
    const json = tables.classes?.get(className);
    if (json && node.tag === 'class') {
      const resolved = classNode(json, node, { withSubclasses: !tables.subclassClasses?.has(className) });
      if (resolved) return resolved;
    }
    if (json && node.tag === 'subclass') {
      const subclass = (json.subclass || []).find((entry) => entry.shortName === (node.shortName || node.name)
        && entry.source === node.source && entry.className === node.className
        && (!node.classSource || entry.classSource === node.classSource));
      if (subclass) return subclassNode(json, subclass);
    }
  }
  const kind = COMPENDIUM_TAGS[node.tag];
  const entry = kind ? lookup?.(kind, node.name, node.source) : null;
  if (!entry && node.tag === 'creature') {
    const creature = tables.creatures?.get(referenceKey(node.name, node.source));
    if (creature) return { type: 'entries', name: creature.name, entries: monsterEntries(creature) };
  }
  // A group the compendium lists only as its empty parent reads like one it
  // does not list at all.
  if (node.tag === 'item' && !(entry?.record?.entries || []).length) {
    const fallback = tables.itemFallback?.get(referenceKey(node.name, node.source));
    if (fallback) return { type: 'entries', name: fallback.name, entries: variantEntries(fallback) };
  }
  if (node.tag === 'vehicle') {
    const vehicle = tables.vehicle?.get(referenceKey(node.name, node.source));
    if (vehicle) return { type: 'entries', name: vehicle.name, entries: vehicleEntries(vehicle) };
  }
  if (entry) {
    const { record } = entry;
    if (kind === 'monster') return { type: 'entries', name: entry.name, entries: monsterEntries(record) };
    if (kind === 'spell') return { type: 'entries', name: entry.name, entries: spellEntries(record, entry.subtitle) };
    const entries = record.entries || [];
    return {
      type: 'entries',
      name: entry.name,
      entries: kind === 'item' && entry.subtitle ? [`{@i ${entry.subtitle}}`, ...entries] : entries,
    };
  }
  const record = tables[node.tag]?.get(referenceKey(node.name, node.source));
  if (record) {
    if (node.tag === 'table' || record.type === 'table') {
      return { ...record, type: 'table', caption: record.caption || record.name };
    }
    return { type: 'entries', name: record.name, entries: record.entries || [] };
  }
  return { type: 'entries', name: node.name, entries: [`{@i The full ${referenceLabel(node.tag)} is not shown here.}`] };
}

// Boxes the text converter has no words for: the spellcasting formulas of a
// class, and a quote's attribution.
function boxNode(node) {
  if (node.type === 'abilityDc') {
    return { type: 'entries', name: `${node.name} save DC`, entries: [`8 + your Proficiency Bonus + your ${abilityList(node.attributes)} modifier`] };
  }
  if (node.type === 'abilityAttackMod') {
    return { type: 'entries', name: `${node.name} attack modifier`, entries: [`Your Proficiency Bonus + your ${abilityList(node.attributes)} modifier`] };
  }
  if (node.type === 'abilityGeneric') {
    return { type: 'entries', name: node.name, entries: [node.text || abilityList(node.attributes)] };
  }
  if (node.type === 'quote' && node.by) {
    return { type: 'entries', entries: [...(node.entries || []), `{@i — ${node.by}${node.from ? `, ${node.from}` : ''}}`] };
  }
  return null;
}

// A copy of the book with every reference replaced by what it stands for
// (itself resolved in turn: a class feature may hold a formula box).
export function resolveBookReferences(data, context) {
  const walk = (node, depth = 0) => {
    if (Array.isArray(node)) return node.map((item) => walk(item, depth)).filter((item) => item != null);
    if (!node || typeof node !== 'object') return node;
    if (isReference(node)) {
      const resolved = referenceNode(node, context);
      return resolved && depth < 3 ? walk(resolved, depth + 1) : resolved;
    }
    const box = boxNode(node);
    if (box) return walk(box, depth);
    const out = {};
    for (const [key, value] of Object.entries(node)) out[key] = walk(value, depth);
    return out;
  };
  return walk(data);
}

// `lookup` is createCompendiumLookup(index), or nothing when the compendium is
// unavailable (references then stay pointers).
export async function loadBook(meta, { lookup = null } = {}) {
  const json = await getJson(meta.file);
  const parts = json?.bookData || json?.adventureData || [];
  const entry = (Array.isArray(parts) ? parts : []).find((part) => part?.id === meta.id) || parts[0];
  const data = entry?.data || [];
  const tables = await loadReferenceTables(bookReferenceNeeds(data, lookup), lookup);
  return bookChapters(resolveBookReferences(data, { lookup, tables }));
}

const SNIPPET_RADIUS = 70;

function snippetOf(text, term) {
  const lower = text.toLowerCase();
  const at = Math.max(0, lower.indexOf(term));
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + term.length + SNIPPET_RADIUS);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

// Every block of the book holding all the words, with where it is and a piece
// of the text around the first word. From two letters; capped.
export function searchBook(chapters, query, { limit = 200 } = {}) {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];
  const terms = normalized.split(' ');
  const hits = [];
  for (const chapter of chapters || []) {
    for (const section of chapter.sections) {
      section.blocks.forEach((block, blockIndex) => {
        if (hits.length >= limit) return;
        const text = blockText(block);
        const haystack = normalizeSearchText(text);
        if (!terms.every((term) => haystack.includes(term))) return;
        hits.push({
          key: `${chapter.index}:${section.index}:${blockIndex}`,
          chapterIndex: chapter.index,
          sectionIndex: section.index,
          blockIndex,
          chapter: chapter.name,
          section: section.name,
          snippet: snippetOf(text, terms[0]),
        });
      });
    }
  }
  return hits;
}
