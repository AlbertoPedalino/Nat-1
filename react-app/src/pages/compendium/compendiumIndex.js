// The compendium: one searchable list over the 5etools records the app already
// loads (spells, items, monsters, rules…), filtered to the supported 2024
// manuals by the loaders themselves.
//
// Pure: the loading lives in loadCompendium.js, so this can be tested in node.

import { normalizeSearchText } from '../../shared/content/searchText.js';
import { CORE_2024_SOURCE_PRIORITY, isAllowedSource, sourceRank } from '../../shared/content/sourcePriority.js';
import { decodeItemTypeLabel } from '../../shared/character/inventory/itemCodes.js';
import { getCR, getType } from '../encounterbuilder/bestiary/monsterUtils.js';

export const COMPENDIUM_KINDS = Object.freeze([
  { key: 'spell', label: 'Spells', single: 'Spell' },
  { key: 'item', label: 'Items', single: 'Item' },
  { key: 'monster', label: 'Monsters', single: 'Monster' },
  { key: 'condition', label: 'Conditions', single: 'Condition' },
  { key: 'action', label: 'Actions', single: 'Action' },
  { key: 'rule', label: 'Rules', single: 'Rule' },
  { key: 'feat', label: 'Feats', single: 'Feat' },
  { key: 'species', label: 'Species', single: 'Species' },
  { key: 'background', label: 'Backgrounds', single: 'Background' },
]);

const FEAT_CATEGORIES = Object.freeze({
  O: 'Origin feat',
  G: 'General feat',
  FS: 'Fighting Style feat',
  'FS:P': 'Fighting Style feat',
  'FS:R': 'Fighting Style feat',
  EB: 'Epic Boon feat',
  DG: 'Dark Gift',
});

function ordinal(level) {
  const n = Number(level) || 0;
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

function capitalize(text) {
  const value = String(text || '');
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function spellSubtitle(spell) {
  const school = spell.schoolFull || spell.school || '';
  const base = Number(spell.level) ? `${ordinal(spell.level)}-level ${school}` : `${school} cantrip`;
  const tags = [spell.ritual ? 'ritual' : '', spell.concentration ? 'concentration' : ''].filter(Boolean);
  return tags.length ? `${base} (${tags.join(', ')})` : base;
}

function itemSubtitle(item) {
  const parts = [item.wondrous ? 'Wondrous item' : decodeItemTypeLabel(item)];
  if (item.rarity && item.rarity !== 'none') parts.push(item.rarity);
  const line = parts.join(', ');
  return item.reqAttune ? `${line} (requires attunement)` : line;
}

function monsterSubtitle(monster) {
  return [`CR ${getCR(monster.cr)}`, capitalize(getType(monster.type))].filter(Boolean).join(' · ');
}

const SUBTITLES = {
  spell: spellSubtitle,
  item: itemSubtitle,
  monster: monsterSubtitle,
  feat: (feat) => FEAT_CATEGORIES[feat.category] || 'Feat',
  condition: () => 'Condition',
  action: () => 'Action',
  rule: () => 'Rule',
  species: () => 'Species',
  background: () => 'Background',
};

function toEntry(kind, record) {
  if (!record?.name) return null;
  const source = String(record.source || '');
  return {
    key: `${kind}:${record.name}|${source}`,
    kind,
    name: String(record.name),
    source,
    subtitle: SUBTITLES[kind]?.(record) || '',
    nameText: normalizeSearchText(record.name),
    record,
  };
}

// Records by kind -> one list, sorted by name. Rules come from variantrules.json,
// which also carries the 2014 books: only the supported manuals stay.
export function buildCompendiumIndex(records = {}) {
  const entries = [];
  for (const { key } of COMPENDIUM_KINDS) {
    let list = Array.isArray(records[key]) ? records[key] : [];
    if (key === 'rule') list = list.filter((rule) => isAllowedSource(rule.source, CORE_2024_SOURCE_PRIORITY));
    for (const record of list) {
      const entry = toEntry(key, record);
      if (entry) entries.push(entry);
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name)
    || sourceRank(a.source, CORE_2024_SOURCE_PRIORITY) - sourceRank(b.source, CORE_2024_SOURCE_PRIORITY));
}

// The words of a record's description, for a search that goes past names.
// 5etools markup ({@spell fireball|XPHB}) keeps only what it shows.
const textCache = new WeakMap();

function collectText(value, out) {
  if (typeof value === 'string') {
    out.push(value.replace(/\{@\w+\s+([^}|]*)[^}]*\}/g, '$1'));
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, out));
  } else if (value && typeof value === 'object') {
    if (typeof value.name === 'string') out.push(value.name);
    for (const key of ['entries', 'items', 'rows', 'entry', 'colLabels']) collectText(value[key], out);
  }
}

export function compendiumEntryText(entry) {
  const record = entry?.record;
  if (!record || typeof record !== 'object') return '';
  if (textCache.has(record)) return textCache.get(record);
  const out = [];
  collectText(record.descriptionEntries || record.entries, out);
  if (entry.kind === 'spell') collectText(record.higherLevelEntries, out);
  if (entry.kind === 'monster') {
    for (const key of ['trait', 'action', 'bonus', 'reaction', 'legendary']) collectText(record[key], out);
  }
  const text = normalizeSearchText(out.join(' '));
  textCache.set(record, text);
  return text;
}

function nameRank(entry, query, terms) {
  const name = entry.nameText;
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  const words = name.split(' ');
  if (terms.every((term) => words.some((word) => word.startsWith(term)))) return 2;
  if (terms.every((term) => name.includes(term))) return 3;
  return null;
}

// Name matches first (exact, prefix, word starts, anywhere), then — from three
// letters on — matches in the description. With no query, the kind's list.
// `kind` is a key of COMPENDIUM_KINDS or 'all'.
export function searchCompendium(index, query, { kind = 'all', limit = 100, inText = true } = {}) {
  const pool = (index || []).filter((entry) => kind === 'all' || entry.kind === kind);
  const normalized = normalizeSearchText(query);
  if (!normalized) return pool.slice(0, limit);
  const terms = normalized.split(' ');
  const ranked = [];
  for (const entry of pool) {
    let rank = nameRank(entry, normalized, terms);
    if (rank == null && inText && normalized.length >= 3) {
      const text = compendiumEntryText(entry);
      if (terms.every((term) => text.includes(term))) rank = 4;
    }
    if (rank != null) ranked.push({ entry, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank
    || a.entry.name.length - b.entry.name.length
    || a.entry.name.localeCompare(b.entry.name)
    || sourceRank(a.entry.source, CORE_2024_SOURCE_PRIORITY) - sourceRank(b.entry.source, CORE_2024_SOURCE_PRIORITY));
  return ranked.slice(0, limit).map(({ entry }) => entry);
}

// Find an entry by kind, name and source (a book's reference to it); any
// source of that name when the exact one is not held.
export function createCompendiumLookup(index) {
  const exact = new Map();
  const byName = new Map();
  for (const entry of index || []) {
    exact.set(`${entry.kind}|${entry.nameText}|${entry.source.toLowerCase()}`, entry);
    const key = `${entry.kind}|${entry.nameText}`;
    if (!byName.has(key)) byName.set(key, entry);
  }
  return (kind, name, source) => {
    const nameText = normalizeSearchText(name);
    return exact.get(`${kind}|${nameText}|${String(source || '').toLowerCase()}`)
      || byName.get(`${kind}|${nameText}`)
      || null;
  };
}

export function compendiumKind(key) {
  return COMPENDIUM_KINDS.find((kind) => kind.key === key) || null;
}
