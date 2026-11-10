import { lowerKey, recordKey } from './nameKeys.js';

// 5etools `_copy` records: a record that copies another one ("Dwarf|WoW"
// copies "Dwarf|XPHB", "Shaman|WoW" copies "Barbarian|XPHB") and changes it
// through `_copy._mod`. The one resolver for items, species, classes,
// subclasses and legendary groups. The copy keeps its own fields (its
// `source` first), so a reprint never takes over the record it copies.

export function cloneJson(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cloneJson);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneJson(child)]));
}

// What a copy does not take from the record it copies unless `_preserve`
// names it: the page, credits and lineages belong to the book it is in.
const NOT_INHERITED = [
  'page', 'srd', 'srd52', 'basicRules', 'basicRules2024', 'otherSources',
  'additionalSources', 'reprintedAs', 'hasFluff', 'hasFluffImages', 'hasToken',
  '_versions',
];

function getParentAndKey(target, path, create = false) {
  const parts = String(path || '').split('.').filter(Boolean);
  if (!parts.length) return null;
  let parent = target;
  for (const part of parts.slice(0, -1)) {
    if (!parent[part] || typeof parent[part] !== 'object' || Array.isArray(parent[part])) {
      if (!create) return null;
      parent[part] = {};
    }
    parent = parent[part];
  }
  return { parent, key: parts.at(-1) };
}

function arrayItems(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.map(cloneJson) : [cloneJson(value)];
}

function sameJsonValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// The index an array modification targets: a number, `{ index }`, an entry
// name ("Elven Lineage") or `{ regex }` on the entry's name or text.
function targetIndex(current, replace) {
  if (replace == null) return -1;
  if (typeof replace === 'number') return replace;
  if (typeof replace === 'object' && replace.index != null) return Number(replace.index);
  const matches = (entry) => {
    const text = typeof entry === 'string' ? entry : entry?.name;
    if (text == null) return false;
    if (typeof replace === 'object' && replace.regex) {
      return new RegExp(replace.regex, replace.flags || '').test(String(text));
    }
    return lowerKey(text) === lowerKey(replace);
  };
  return current.findIndex(matches);
}

// replaceTxt edits the text of entries: plain strings and, inside entry
// objects, the props it names (by default their entries, not their names).
const TEXT_PROPS = ['entries', 'headerEntries', 'footerEntries', 'items'];

function replaceText(value, pattern, replacement, props) {
  if (typeof value === 'string') return value.replace(pattern, replacement);
  if (Array.isArray(value)) return value.map((child) => replaceText(child, pattern, replacement, props));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      props.includes(key) ? replaceText(child, pattern, replacement, props) : child,
    ]));
  }
  return value;
}

function applyModification(target, path, rawModification) {
  if (Array.isArray(rawModification)) {
    rawModification.forEach((modification) => applyModification(target, path, modification));
    return;
  }
  const modification = rawModification === 'remove' ? { mode: 'remove' } : rawModification;
  if (!modification || typeof modification !== 'object') return;

  if (modification.mode === 'replaceTxt') {
    const pattern = new RegExp(modification.replace, `g${modification.flags || ''}`);
    const paths = path === '*' ? Object.keys(target).filter((key) => key !== 'name' && key !== 'source') : [path];
    paths.forEach((key) => {
      const location = getParentAndKey(target, key);
      if (location && location.parent[location.key] != null) {
        const props = Array.isArray(modification.props) ? modification.props.filter(Boolean) : TEXT_PROPS;
        location.parent[location.key] = replaceText(location.parent[location.key], pattern, modification.with ?? '', props);
      }
    });
    return;
  }

  const location = getParentAndKey(target, path, modification.mode !== 'remove');
  if (!location) return;
  const { parent, key } = location;

  if (modification.mode === 'remove') {
    delete parent[key];
    return;
  }
  if (modification.mode === 'setProp') {
    parent[key] = cloneJson(modification.value);
    return;
  }

  const current = Array.isArray(parent[key]) ? parent[key].map(cloneJson) : [];
  const items = arrayItems(modification.items);
  if (modification.mode === 'appendArr') {
    parent[key] = [...current, ...items];
  } else if (modification.mode === 'prependArr') {
    parent[key] = [...items, ...current];
  } else if (modification.mode === 'appendIfNotExistsArr') {
    parent[key] = [...current, ...items.filter((item) => !current.some((entry) => sameJsonValue(entry, item)))];
  } else if (modification.mode === 'insertArr') {
    const requestedIndex = Number(modification.index);
    const index = Number.isFinite(requestedIndex) && requestedIndex >= 0
      ? Math.min(requestedIndex, current.length)
      : current.length;
    parent[key] = [...current.slice(0, index), ...items, ...current.slice(index)];
  } else if (modification.mode === 'replaceArr') {
    const index = targetIndex(current, modification.replace ?? modification.index);
    if (!Number.isFinite(index) || index < 0 || index >= current.length) return;
    parent[key] = [...current.slice(0, index), ...items, ...current.slice(index + 1)];
  } else if (modification.mode === 'renameArr') {
    const renames = arrayItems(modification.renames);
    parent[key] = current.map((entry) => {
      const rename = renames.find((item) => lowerKey(item?.rename) === lowerKey(entry?.name));
      return rename ? { ...entry, name: rename.with } : entry;
    });
  } else if (modification.mode === 'removeArr') {
    const names = arrayItems(modification.names).map(lowerKey);
    parent[key] = current.filter((entry) => {
      if (names.length) return !names.includes(lowerKey(typeof entry === 'string' ? entry : entry?.name));
      return !items.some((item) => sameJsonValue(entry, item));
    });
  }
}

// A record's `_mod`s applied in place ({ prop: modification | [modification] }):
// a copy's, or a stat block version's (a summon's "Beast of the Air").
export function applyCopyMods(target, mods) {
  Object.entries(mods || {}).forEach(([path, modification]) => applyModification(target, path, modification));
  return target;
}

const defaultKeyOf = (record) => recordKey(record?.name, record?.source);
const defaultCopyKeyOf = (copy, record) => recordKey(copy.name, copy.source || record?.source);

/**
 * Resolve the `_copy` chains of a list of records (keeping the upstream data
 * external: nothing is stored). `keyOf(record)` and `copyKeyOf(copy, record)`
 * say how a record and the record a copy names are found (subclasses add
 * their class). Records a copy may point at but that are not themselves
 * returned go in `pool`.
 */
export function resolveCopyRecords(records, { keyOf = defaultKeyOf, copyKeyOf = defaultCopyKeyOf, pool = [] } = {}) {
  const list = Array.isArray(records) ? records : [];
  const lookup = new Map([...pool, ...list].map((record) => [keyOf(record), record]));
  const resolved = new Map();
  const resolving = new Set();

  function resolve(record) {
    if (!record || typeof record !== 'object') return record;
    const key = keyOf(record);
    if (resolved.has(key)) return cloneJson(resolved.get(key));
    if (resolving.has(key)) return cloneJson(record);
    resolving.add(key);

    let result = {};
    const copy = record._copy;
    if (copy && (copy.name || copy.shortName)) {
      const base = lookup.get(copyKeyOf(copy, record));
      if (base) {
        result = resolve(base);
        const preserve = copy._preserve || {};
        NOT_INHERITED.forEach((field) => { if (!preserve[field]) delete result[field]; });
      }
      applyCopyMods(result, copy._mod);
    }

    Object.entries(record).forEach(([field, value]) => {
      if (field !== '_copy') result[field] = cloneJson(value);
    });
    resolving.delete(key);
    resolved.set(key, result);
    return cloneJson(result);
  }

  return list.map(resolve);
}
