function normKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function subclassKey(className, subclassShortName) {
  const cls = normKey(className);
  const sub = normKey(subclassShortName);
  return cls && sub ? `${cls}_${sub}` : '';
}

function subclassAlias(value) {
  const raw = normKey(value)
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
  const cls = normKey(className);
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
  const name = normKey(speciesName);
  const source = normKey(speciesSource);
  return name && source ? `${name}_${source}` : name;
}

function setStore(store, rawKey, value) {
  const raw = String(rawKey || '');
  const norm = normKey(raw);
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

function setMergedStore(store, rawKey, value) {
  const raw = String(rawKey || '');
  const norm = normKey(raw);
  const existing = (raw && store.get(raw)) || (norm && store.get(norm)) || {};
  const merged = mergeRuntimeConfig(existing, value);
  if (raw) store.set(raw, merged);
  if (norm) store.set(norm, merged);
}

function getStore(store, rawKey, fallbackKey = '') {
  const raw = String(rawKey || '');
  return store.get(raw) || store.get(normKey(raw)) || (fallbackKey ? store.get(fallbackKey) : null);
}

export function createAdapterRegistry() {
  const stores = {
    classAdapters: new Map(),
    subclassAdapters: new Map(),
    speciesAdapters: new Map(),
    featAdapters: new Map(),
    classActions: new Map(),
    subclassActions: new Map(),
    speciesActions: new Map(),
    featActions: new Map(),
    classResources: new Map(),
    subclassResources: new Map(),
    speciesResources: new Map(),
    featResources: new Map(),
    classEffects: new Map(),
    subclassEffects: new Map(),
    speciesEffects: new Map(),
    featEffects: new Map(),
    classRuntimeConfigs: new Map(),
    subclassRuntimeConfigs: new Map(),
    speciesRuntimeConfigs: new Map(),
    classChoiceMeta: new Map(),
    subclassChoiceMeta: new Map(),
    speciesChoiceMeta: new Map(),
    classFeatureFilters: new Map(),
    subclassFeatureFilters: new Map(),
    speciesFeatureFilters: new Map(),
    classProficiencies: new Map(),
    subclassProficiencies: new Map(),
    speciesProficiencies: new Map(),
    classSpellModifiers: new Map(),
    subclassSpellModifiers: new Map(),
    speciesSpellModifiers: new Map(),
    classChoiceKeyFilters: new Map(),
    classChoiceLabelProviders: new Map(),
    speciesHpBonus: new Map(),
    classAtWillSpells: new Map(),
    speciesLongRestGrants: new Map(),
    resourceSideEffects: new Map(),
    subclassChoiceDetailDataProviders: new Map(),
    cantripData: new Map(),
    cantripDataModifiers: new Map(),
    spellData: new Map(),
    globalClassAdapters: [],
    globalSubclassAdapters: [],
    globalSpeciesAdapters: [],
    globalFeatAdapters: [],
    globalSpellAdapters: [],
    globalItemAdapters: [],
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
    registerClassAdapter(name, fn) {
      if (typeof fn === 'function') setStore(stores.classAdapters, name, fn);
    },
    getClassAdapter(name) {
      return getStore(stores.classAdapters, name);
    },
    registerSubclassAdapter(className, subclassShortName, fn) {
      if (typeof fn === 'function') stores.subclassAdapters.set(subclassKey(className, subclassShortName), fn);
    },
    getSubclassAdapter(className, subclassShortName) {
      return getSubclassStore(stores.subclassAdapters, className, subclassShortName) || null;
    },
    registerSpeciesAdapter(speciesName, speciesSource, fn) {
      if (typeof fn === 'function') stores.speciesAdapters.set(speciesKey(speciesName, speciesSource), fn);
    },
    getSpeciesAdapter(speciesName, speciesSource) {
      return stores.speciesAdapters.get(speciesKey(speciesName, speciesSource)) || null;
    },
    registerFeatAdapter(name, fn) {
      if (typeof fn === 'function') setStore(stores.featAdapters, name, fn);
    },
    getFeatAdapter(name) {
      return getStore(stores.featAdapters, name);
    },
    registerClassSheetActions(name, actions) {
      setStore(stores.classActions, name, Array.isArray(actions) ? actions : []);
    },
    getClassSheetActions(name) {
      return getStore(stores.classActions, name) || [];
    },
    registerSubclassSheetActions(className, subclassShortName, actions) {
      stores.subclassActions.set(subclassKey(className, subclassShortName), Array.isArray(actions) ? actions : []);
    },
    getSubclassSheetActions(className, subclassShortName) {
      return getSubclassStore(stores.subclassActions, className, subclassShortName) || [];
    },
    registerSpeciesSheetActions(speciesName, speciesSource, actions) {
      stores.speciesActions.set(speciesKey(speciesName, speciesSource), Array.isArray(actions) ? actions : []);
    },
    getSpeciesSheetActions(speciesName, speciesSource) {
      return stores.speciesActions.get(speciesKey(speciesName, speciesSource)) || [];
    },
    registerFeatSheetActions(name, actions) {
      setStore(stores.featActions, name, Array.isArray(actions) ? actions : []);
    },
    getFeatSheetActions(name) {
      return getStore(stores.featActions, name) || [];
    },
    registerClassSheetResources(name, resources) {
      setStore(stores.classResources, name, Array.isArray(resources) ? resources : []);
    },
    getClassSheetResources(name) {
      return getStore(stores.classResources, name) || [];
    },
    registerSubclassSheetResources(className, subclassShortName, resources) {
      stores.subclassResources.set(subclassKey(className, subclassShortName), Array.isArray(resources) ? resources : []);
    },
    getSubclassSheetResources(className, subclassShortName) {
      return getSubclassStore(stores.subclassResources, className, subclassShortName) || [];
    },
    registerSpeciesSheetResources(speciesName, speciesSource, resources) {
      stores.speciesResources.set(speciesKey(speciesName, speciesSource), Array.isArray(resources) ? resources : []);
    },
    getSpeciesSheetResources(speciesName, speciesSource) {
      return stores.speciesResources.get(speciesKey(speciesName, speciesSource)) || [];
    },
    registerFeatSheetResources(name, resources) {
      setStore(stores.featResources, name, Array.isArray(resources) ? resources : []);
    },
    getFeatSheetResources(name) {
      return getStore(stores.featResources, name) || [];
    },
    registerClassSheetEffects(name, effects) {
      setStore(stores.classEffects, name, Array.isArray(effects) ? effects : []);
    },
    getClassSheetEffects(name) {
      return getStore(stores.classEffects, name) || [];
    },
    registerSubclassSheetEffects(className, subclassShortName, effects) {
      stores.subclassEffects.set(subclassKey(className, subclassShortName), Array.isArray(effects) ? effects : []);
    },
    getSubclassSheetEffects(className, subclassShortName) {
      return getSubclassStore(stores.subclassEffects, className, subclassShortName) || [];
    },
    registerSpeciesSheetEffects(speciesName, speciesSource, effects) {
      stores.speciesEffects.set(speciesKey(speciesName, speciesSource), Array.isArray(effects) ? effects : []);
    },
    getSpeciesSheetEffects(speciesName, speciesSource) {
      return stores.speciesEffects.get(speciesKey(speciesName, speciesSource)) || [];
    },
    registerFeatSheetEffects(name, effects) {
      setStore(stores.featEffects, name, Array.isArray(effects) ? effects : []);
    },
    getFeatSheetEffects(name) {
      return getStore(stores.featEffects, name) || [];
    },
    registerClassRuntimeConfig(name, config) {
      setMergedStore(stores.classRuntimeConfigs, name, config);
    },
    getClassRuntimeConfig(name) {
      return getStore(stores.classRuntimeConfigs, name) || {};
    },
    registerSubclassRuntimeConfig(className, subclassShortName, config) {
      const key = subclassKey(className, subclassShortName);
      stores.subclassRuntimeConfigs.set(key, mergeRuntimeConfig(stores.subclassRuntimeConfigs.get(key), config));
    },
    getSubclassRuntimeConfig(className, subclassShortName) {
      return getSubclassStore(stores.subclassRuntimeConfigs, className, subclassShortName) || {};
    },
    registerSpeciesRuntimeConfig(speciesName, speciesSource, config) {
      const key = speciesKey(speciesName, speciesSource);
      stores.speciesRuntimeConfigs.set(key, mergeRuntimeConfig(stores.speciesRuntimeConfigs.get(key), config));
    },
    getSpeciesRuntimeConfig(speciesName, speciesSource) {
      return stores.speciesRuntimeConfigs.get(speciesKey(speciesName, speciesSource)) || {};
    },
    registerClassSheetChoiceMeta(name, meta) {
      setStore(stores.classChoiceMeta, name, meta && typeof meta === 'object' ? meta : {});
    },
    getClassSheetChoiceMeta(name) {
      return getStore(stores.classChoiceMeta, name) || {};
    },
    registerSubclassSheetChoiceMeta(className, subclassShortName, meta) {
      stores.subclassChoiceMeta.set(subclassKey(className, subclassShortName), meta && typeof meta === 'object' ? meta : {});
    },
    getSubclassSheetChoiceMeta(className, subclassShortName) {
      return getSubclassStore(stores.subclassChoiceMeta, className, subclassShortName) || {};
    },
    registerSpeciesSheetChoiceMeta(speciesName, speciesSource, meta) {
      stores.speciesChoiceMeta.set(speciesKey(speciesName, speciesSource), meta && typeof meta === 'object' ? meta : {});
    },
    getSpeciesSheetChoiceMeta(speciesName, speciesSource) {
      return stores.speciesChoiceMeta.get(speciesKey(speciesName, speciesSource)) || {};
    },
    registerClassSheetFeatureFilter(name, fn) {
      if (typeof fn !== 'function') return;
      const list = getStore(stores.classFeatureFilters, name) || [];
      setStore(stores.classFeatureFilters, name, [...list, fn]);
    },
    getClassSheetFeatureFilters(name) {
      return getStore(stores.classFeatureFilters, name) || [];
    },
    registerSubclassSheetFeatureFilter(className, subclassShortName, fn) {
      if (typeof fn !== 'function') return;
      const keyName = subclassKey(className, subclassShortName);
      stores.subclassFeatureFilters.set(keyName, [...(stores.subclassFeatureFilters.get(keyName) || []), fn]);
    },
    getSubclassSheetFeatureFilters(className, subclassShortName) {
      return getSubclassStore(stores.subclassFeatureFilters, className, subclassShortName) || [];
    },
    registerSpeciesSheetFeatureFilter(speciesName, speciesSource, fn) {
      if (typeof fn !== 'function') return;
      const keyName = speciesKey(speciesName, speciesSource);
      stores.speciesFeatureFilters.set(keyName, [...(stores.speciesFeatureFilters.get(keyName) || []), fn]);
    },
    getSpeciesSheetFeatureFilters(speciesName, speciesSource) {
      return stores.speciesFeatureFilters.get(speciesKey(speciesName, speciesSource)) || [];
    },
    registerClassSheetProficiencies(name, grants) {
      setStore(stores.classProficiencies, name, Array.isArray(grants) ? grants : []);
    },
    getClassSheetProficiencies(name) {
      return getStore(stores.classProficiencies, name) || [];
    },
    registerSubclassSheetProficiencies(className, subclassShortName, grants) {
      stores.subclassProficiencies.set(subclassKey(className, subclassShortName), Array.isArray(grants) ? grants : []);
    },
    getSubclassSheetProficiencies(className, subclassShortName) {
      return getSubclassStore(stores.subclassProficiencies, className, subclassShortName) || [];
    },
    registerSpeciesSheetProficiencies(speciesName, speciesSource, grants) {
      stores.speciesProficiencies.set(speciesKey(speciesName, speciesSource), Array.isArray(grants) ? grants : []);
    },
    getSpeciesSheetProficiencies(speciesName, speciesSource) {
      return stores.speciesProficiencies.get(speciesKey(speciesName, speciesSource)) || [];
    },
    registerClassSheetSpellModifiers(name, modifiers) {
      setStore(stores.classSpellModifiers, name, Array.isArray(modifiers) ? modifiers : []);
    },
    getClassSheetSpellModifiers(name) {
      return getStore(stores.classSpellModifiers, name) || [];
    },
    registerSubclassSheetSpellModifiers(className, subclassShortName, modifiers) {
      stores.subclassSpellModifiers.set(subclassKey(className, subclassShortName), Array.isArray(modifiers) ? modifiers : []);
    },
    getSubclassSheetSpellModifiers(className, subclassShortName) {
      return getSubclassStore(stores.subclassSpellModifiers, className, subclassShortName) || [];
    },
    registerSpeciesSheetSpellModifiers(speciesName, speciesSource, modifiers) {
      stores.speciesSpellModifiers.set(speciesKey(speciesName, speciesSource), Array.isArray(modifiers) ? modifiers : []);
    },
    getSpeciesSheetSpellModifiers(speciesName, speciesSource) {
      return stores.speciesSpellModifiers.get(speciesKey(speciesName, speciesSource)) || [];
    },
    registerClassChoiceKeyFilter(name, fn) {
      if (typeof fn === 'function') setStore(stores.classChoiceKeyFilters, name, fn);
    },
    getClassChoiceKeyFilter(name) {
      return getStore(stores.classChoiceKeyFilters, name);
    },
    registerClassChoiceLabelProvider(name, fn) {
      if (typeof fn === 'function') setStore(stores.classChoiceLabelProviders, name, fn);
    },
    getClassChoiceLabelProvider(name) {
      return getStore(stores.classChoiceLabelProviders, name);
    },
    registerSpeciesSheetHpBonus(speciesName, speciesSource, value) {
      stores.speciesHpBonus.set(speciesKey(speciesName, speciesSource), Number(value) || 0);
    },
    getSpeciesSheetHpBonus(speciesName, speciesSource) {
      return stores.speciesHpBonus.get(speciesKey(speciesName, speciesSource)) || 0;
    },
    registerClassAtWillSpells(name, spells) {
      setStore(stores.classAtWillSpells, name, Array.isArray(spells) ? spells : []);
    },
    getClassAtWillSpells(name) {
      return getStore(stores.classAtWillSpells, name);
    },
    registerSpeciesLongRestGrants(speciesName, speciesSource, grants) {
      stores.speciesLongRestGrants.set(speciesKey(speciesName, speciesSource), grants);
    },
    getSpeciesLongRestGrants(speciesName, speciesSource) {
      return stores.speciesLongRestGrants.get(speciesKey(speciesName, speciesSource)) || null;
    },
    registerResourceSideEffect(name, fn) {
      if (typeof fn === 'function') stores.resourceSideEffects.set(String(name), fn);
    },
    getResourceSideEffect(name) {
      return stores.resourceSideEffects.get(String(name)) || null;
    },
    registerSubclassChoiceDetailDataProvider(className, subclassShortName, fn) {
      if (typeof fn === 'function') stores.subclassChoiceDetailDataProviders.set(subclassKey(className, subclassShortName), fn);
    },
    getSubclassChoiceDetailDataProvider(className, subclassShortName) {
      return getSubclassStore(stores.subclassChoiceDetailDataProviders, className, subclassShortName) || null;
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
    registerGlobalClassAdapter(fn) {
      if (typeof fn === 'function') stores.globalClassAdapters.push(fn);
    },
    getGlobalClassAdapters() {
      return stores.globalClassAdapters.slice();
    },
    registerGlobalSubclassAdapter(fn) {
      if (typeof fn === 'function') stores.globalSubclassAdapters.push(fn);
    },
    getGlobalSubclassAdapters() {
      return stores.globalSubclassAdapters.slice();
    },
    registerGlobalSpeciesAdapter(fn) {
      if (typeof fn === 'function') stores.globalSpeciesAdapters.push(fn);
    },
    getGlobalSpeciesAdapters() {
      return stores.globalSpeciesAdapters.slice();
    },
    registerGlobalFeatAdapter(fn) {
      if (typeof fn === 'function') stores.globalFeatAdapters.push(fn);
    },
    getGlobalFeatAdapters() {
      return stores.globalFeatAdapters.slice();
    },
    registerGlobalSpellAdapter(fn) {
      if (typeof fn === 'function') stores.globalSpellAdapters.push(fn);
    },
    getGlobalSpellAdapters() {
      return stores.globalSpellAdapters.slice();
    },
    registerGlobalItemAdapter(fn) {
      if (typeof fn === 'function') stores.globalItemAdapters.push(fn);
    },
    getGlobalItemAdapters() {
      return stores.globalItemAdapters.slice();
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
    // Magic items granting an extra attack with the weapon itself (e.g. Scimitar
    // of Speed's Bonus Action attack). `match(item, C)` decides per equipped
    // weapon; a matching override clones the weapon's attack card into `cat`.
    registerWeaponExtraAttack(config) {
      if (config?.key && typeof config.match === 'function') stores.weaponExtraAttacks.push(config);
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
    snapshot() {
      return stores;
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
