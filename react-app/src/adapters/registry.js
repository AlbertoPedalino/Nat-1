import { matchKey } from '../shared/content/nameKeys.js';
function subclassKey(className, subclassShortName) {
  const cls = matchKey(className);
  const sub = matchKey(subclassShortName);
  return cls && sub ? `${cls}_${sub}` : '';
}

function subclassAlias(value) {
  const raw = matchKey(value)
    .replace(/^(schoolof|collegeof|circleof|oathof|pathof|wayof|domainof|traditionof)/, '');
  const aliases = {
    abjuration: 'abjurer',
    divination: 'diviner',
    evocation: 'evoker',
    illusion: 'illusionist',
    transmutation: 'transmuter',
    bladesinging: 'bladesinger',
  };
  return aliases[raw] || raw;
}

function getSubclassStore(store, className, subclassShortName) {
  const exact = subclassKey(className, subclassShortName);
  if (store.has(exact)) return store.get(exact);
  const cls = matchKey(className);
  const sub = subclassAlias(subclassShortName);
  if (!cls || !sub) return null;
  for (const [key, value] of store.entries()) {
    if (!key.startsWith(`${cls}_`)) continue;
    const storedSub = key.slice(cls.length + 1);
    if (storedSub === sub || storedSub.includes(sub) || sub.includes(storedSub)) return value;
  }
  return null;
}

function speciesKey(speciesName, speciesSource) {
  const name = matchKey(speciesName);
  const source = matchKey(speciesSource);
  return name && source ? `${name}_${source}` : name;
}

function setStore(store, rawKey, value) {
  const raw = String(rawKey || '');
  const norm = matchKey(raw);
  if (raw) store.set(raw, value);
  if (norm) store.set(norm, value);
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function mergeRuntimeConfig(base, patch) {
  if (!isPlainObject(base)) return isPlainObject(patch) ? { ...patch } : {};
  if (!isPlainObject(patch)) return { ...base };

  const merged = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    const current = merged[key];
    merged[key] = isPlainObject(current) && isPlainObject(value)
      ? mergeRuntimeConfig(current, value)
      : value;
  });
  return merged;
}


function getStore(store, rawKey) {
  const raw = String(rawKey || '');
  return store.get(raw) || store.get(matchKey(raw)) || null;
}

// How each owner kind is keyed: `arity` key arguments, then the value. `find` is the lookup a reader gets (a subclass
// also matches by alias: "School of Evocation" finds "Evoker"); `exact` is the
// one a merge or an append builds on, so it never lands on another owner's entry.
const OWNER_KINDS = {
  Class: {
    arity: 1,
    find: (store, [name]) => getStore(store, name),
    exact: (store, [name]) => getStore(store, name),
    write: (store, [name], value) => setStore(store, name, value),
  },
  Feat: {
    arity: 1,
    find: (store, [name]) => getStore(store, name),
    exact: (store, [name]) => getStore(store, name),
    write: (store, [name], value) => setStore(store, name, value),
  },
  Subclass: {
    arity: 2,
    find: (store, [className, subclassName]) => getSubclassStore(store, className, subclassName),
    exact: (store, [className, subclassName]) => store.get(subclassKey(className, subclassName)),
    write: (store, [className, subclassName], value) => store.set(subclassKey(className, subclassName), value),
  },
  Species: {
    arity: 2,
    find: (store, [name, source]) => store.get(speciesKey(name, source)),
    exact: (store, [name, source]) => store.get(speciesKey(name, source)),
    write: (store, [name, source], value) => store.set(speciesKey(name, source), value),
  },
};

// What an owner (class, subclass, species, feat) can register, and how each
// owner kind is keyed. Every row of KEYED_SLOTS becomes, for each of its kinds,
// `register<Kind><register>(...key, value)` and `get<Kind><get>(...key)` —
// e.g. registerSubclassSheetActions(className, subclassShortName, actions) and
// getSubclassSheetActions(className, subclassShortName).
//
// Value modes:
//   fn     — a function, or nothing is stored
//   list   — an array (anything else stores [])
//   object — an object (anything else stores {})
//   merge  — an object deep-merged into what is already there
//   append — a function added to the owner's list
//   number — a number (anything else stores 0)
//   raw    — stored as given
export const KEYED_SLOTS = [
  { register: 'Adapter', get: 'Adapter', kinds: ['Class', 'Subclass', 'Species', 'Feat'], mode: 'fn', empty: null },
  { register: 'SheetActions', get: 'SheetActions', kinds: ['Class', 'Subclass', 'Species', 'Feat'], mode: 'list', empty: [] },
  { register: 'SheetResources', get: 'SheetResources', kinds: ['Class', 'Subclass', 'Species', 'Feat'], mode: 'list', empty: [] },
  { register: 'SheetEffects', get: 'SheetEffects', kinds: ['Class', 'Subclass', 'Species', 'Feat'], mode: 'list', empty: [] },
  { register: 'RuntimeConfig', get: 'RuntimeConfig', kinds: ['Class', 'Subclass', 'Species'], mode: 'merge', empty: {} },
  { register: 'SheetChoiceMeta', get: 'SheetChoiceMeta', kinds: ['Class', 'Subclass', 'Species'], mode: 'object', empty: {} },
  { register: 'SheetFeatureFilter', get: 'SheetFeatureFilters', kinds: ['Class', 'Subclass', 'Species'], mode: 'append', empty: [] },
  { register: 'SheetProficiencies', get: 'SheetProficiencies', kinds: ['Class', 'Subclass', 'Species'], mode: 'list', empty: [] },
  { register: 'SheetSpellModifiers', get: 'SheetSpellModifiers', kinds: ['Class', 'Subclass', 'Species'], mode: 'list', empty: [] },
  // Spell riders: factories `(ctx) => rider | null` that attach an extra roller /
  // tag / description to a spell row at render time (e.g. Stars Druid Chalice).
  { register: 'SpellRiders', get: 'SpellRiders', kinds: ['Class', 'Subclass', 'Species', 'Feat'], mode: 'list', empty: [] },
  { register: 'AtWillSpells', get: 'AtWillSpells', kinds: ['Class'], mode: 'list', empty: null },
  { register: 'LongRestGrants', get: 'LongRestGrants', kinds: ['Species'], mode: 'raw', empty: null },
];

// Adapters run over every entity of a kind, in registration order.
const GLOBAL_ADAPTER_KINDS = ['Class', 'Subclass', 'Species', 'Feat', 'Spell', 'Item'];

// A fresh copy of a slot's empty value, so a caller pushing into an empty
// result never writes into the shared default.
function emptyValue(empty) {
  if (Array.isArray(empty)) return [];
  if (isPlainObject(empty)) return {};
  return empty;
}

function keyedSlotMethods(slot, kindName, store) {
  const kind = OWNER_KINDS[kindName];
  const { arity } = kind;
  const register = (...args) => {
    const key = args.slice(0, arity);
    const value = args[arity];
    switch (slot.mode) {
      case 'fn': if (typeof value === 'function') kind.write(store, key, value); break;
      case 'list': kind.write(store, key, Array.isArray(value) ? value : []); break;
      case 'object': kind.write(store, key, value && typeof value === 'object' ? value : {}); break;
      case 'merge': kind.write(store, key, mergeRuntimeConfig(kind.exact(store, key), value)); break;
      case 'append':
        if (typeof value === 'function') kind.write(store, key, [...(kind.exact(store, key) || []), value]);
        break;
      case 'number': kind.write(store, key, Number(value) || 0); break;
      default: kind.write(store, key, value);
    }
  };
  const get = (...args) => kind.find(store, args.slice(0, arity)) || emptyValue(slot.empty);
  return {
    [`register${kindName}${slot.register}`]: register,
    [`get${kindName}${slot.get}`]: get,
  };
}

export function createAdapterRegistry() {
  const keyed = {};
  KEYED_SLOTS.forEach((slot) => {
    slot.kinds.forEach((kindName) => Object.assign(keyed, keyedSlotMethods(slot, kindName, new Map())));
  });

  const globals = {};
  GLOBAL_ADAPTER_KINDS.forEach((kindName) => {
    const list = [];
    globals[`registerGlobal${kindName}Adapter`] = (fn) => { if (typeof fn === 'function') list.push(fn); };
    globals[`getGlobal${kindName}Adapters`] = () => list.slice();
  });

  const stores = {
    resourceSideEffects: new Map(),
    cantripData: new Map(),
    cantripDataModifiers: new Map(),
    spellData: new Map(),
    itemFlagDefs: new Map(),
    weaponAbilityOverrides: [],
    weaponExtraAttacks: [],
    featOwnerKeyExact: new Set(),
    featOwnerKeyPrefixes: [],
    featOwnerKeyPrefixSet: new Set(),
    featOwnerKeyPatterns: [],
    featOwnerKeyPatternSigs: new Set(),
  };

  return {
    ...keyed,
    ...globals,
    registerResourceSideEffect(name, fn) {
      if (typeof fn === 'function') stores.resourceSideEffects.set(String(name), fn);
    },
    getResourceSideEffect(name) {
      return stores.resourceSideEffects.get(String(name)) || null;
    },
    registerCantripData(name, data) {
      if (data && typeof data === 'object') setStore(stores.cantripData, name, data);
    },
    getCantripData(name) {
      return getStore(stores.cantripData, name);
    },
    registerCantripDataModifier(name, fn) {
      if (typeof fn !== 'function') return;
      const list = getStore(stores.cantripDataModifiers, name) || [];
      setStore(stores.cantripDataModifiers, name, [...list, fn]);
    },
    getCantripDataModifiers(name) {
      return getStore(stores.cantripDataModifiers, name) || [];
    },
    registerSpellData(name, data) {
      if (data && typeof data === 'object') setStore(stores.spellData, name, data);
    },
    getSpellData(name) {
      return getStore(stores.spellData, name);
    },
    registerItemFlagDef(key, def) {
      if (key && def && typeof def === 'object') stores.itemFlagDefs.set(String(key), { key: String(key), ...def });
    },
    getItemFlagDef(key) {
      return stores.itemFlagDefs.get(String(key)) || null;
    },
    getAllItemFlagDefs() {
      return [...stores.itemFlagDefs.values()];
    },
    registerWeaponAbilityOverride(config) {
      if (config?.key && config?.ability && typeof config.condition === 'function') stores.weaponAbilityOverrides.push(config);
    },
    getWeaponAbilityOverrides() {
      return stores.weaponAbilityOverrides.slice();
    },
    // Magic items granting an extra attack with the weapon itself. Item identity
    // is declarative and source-qualified; the consumer applies the shared item
    // activation policy before evaluating an optional character condition.
    registerWeaponExtraAttack(config) {
      if (!config?.key || !config?.item?.name || !config?.item?.source) return;
      stores.weaponExtraAttacks.push({
        ...config,
        item: { name: config.item.name, source: config.item.source },
      });
    },
    getWeaponExtraAttacks() {
      return stores.weaponExtraAttacks.slice();
    },
    registerFeatOwnerKey(key) {
      if (typeof key === 'string' && key) stores.featOwnerKeyExact.add(key);
    },
    registerFeatOwnerKeyPrefix(prefix) {
      if (typeof prefix !== 'string' || !prefix) return;
      if (stores.featOwnerKeyPrefixSet.has(prefix)) return;
      stores.featOwnerKeyPrefixSet.add(prefix);
      stores.featOwnerKeyPrefixes.push(prefix);
    },
    registerFeatOwnerKeyPattern(pattern) {
      if (pattern == null) return;
      if (typeof pattern === 'string' && pattern) {
        stores.featOwnerKeyExact.add(pattern);
        return;
      }
      const sig = pattern instanceof RegExp
        ? `re:${pattern.source}::${pattern.flags}`
        : typeof pattern === 'function'
          ? `fn:${pattern.toString()}`
          : null;
      if (!sig) return;
      if (stores.featOwnerKeyPatternSigs.has(sig)) return;
      stores.featOwnerKeyPatternSigs.add(sig);
      stores.featOwnerKeyPatterns.push(pattern);
    },
    getFeatOwnerKeyExact() {
      return stores.featOwnerKeyExact;
    },
    getFeatOwnerKeyPrefixes() {
      return stores.featOwnerKeyPrefixes.slice();
    },
    getFeatOwnerKeyPatterns() {
      return stores.featOwnerKeyPatterns.slice();
    },
  };
}

export const adapterRegistry = createAdapterRegistry();

export function installAdapters(adapters, registry = adapterRegistry, context = {}) {
  adapters.forEach((adapter) => {
    if (typeof adapter === 'function') adapter(registry, context);
    else if (typeof adapter?.install === 'function') adapter.install(registry, context);
  });
  return registry;
}
