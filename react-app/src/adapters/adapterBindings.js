import {
  ALL_LANGUAGES,
  ALL_TOOLS,
  ARTISAN_TOOLS,
  EXOTIC_LANGUAGES,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
  SKILLS,
  STANDARD_LANGUAGES,
  VEHICLE_TOOLS,
} from './gameData.js';

export function splitClassSubclass(rawKey) {
  const value = String(rawKey || '');
  const idx = value.indexOf('_');
  return idx < 0 ? [value, ''] : [value.slice(0, idx), value.slice(idx + 1)];
}

export function splitSpecies(rawKey) {
  const value = String(rawKey || '');
  const idx = value.lastIndexOf('_');
  return idx < 0 ? [value, ''] : [value.slice(0, idx), value.slice(idx + 1)];
}

export function createAdapterBindings(registry, context = {}) {
  const subclass = (rawKey, value, method) => {
    const [className, subclassName] = splitClassSubclass(rawKey);
    return registry[method](className, subclassName, value);
  };
  const species = (rawKey, value, method) => {
    const [speciesName, speciesSource] = splitSpecies(rawKey);
    return registry[method](speciesName, speciesSource, value);
  };

  return {
    SKILLS: SKILLS.map((skill) => ({ n: skill.name, a: skill.ability })),
    _ARTISAN_TOOLS: ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS: MUSICAL_INSTRUMENTS,
    _GAMING_SETS: GAMING_SETS,
    _VEHICLE_TOOLS: VEHICLE_TOOLS,
    _STD_LANGS: STANDARD_LANGUAGES,
    _EXOTIC_LANGS: EXOTIC_LANGUAGES,
    _ALL_LANGS: ALL_LANGUAGES,
    _ALL_TOOLS: ALL_TOOLS,
    allItemsDb: context.items || [],

    registerClassAdapter: registry.registerClassAdapter,
    getClassAdapter: registry.getClassAdapter,
    registerSubclassAdapter: (rawKey, fn) => subclass(rawKey, fn, 'registerSubclassAdapter'),
    getSubclassAdapter: registry.getSubclassAdapter,
    registerSpeciesAdapter: (rawKey, fn) => species(rawKey, fn, 'registerSpeciesAdapter'),
    getSpeciesAdapter: registry.getSpeciesAdapter,
    registerFeatAdapter: registry.registerFeatAdapter,
    getFeatAdapter: registry.getFeatAdapter,

    registerClassSheetActions: registry.registerClassSheetActions,
    getClassSheetActions: registry.getClassSheetActions,
    registerSubclassSheetActions: (rawKey, actions) => subclass(rawKey, actions, 'registerSubclassSheetActions'),
    getSubclassSheetActions: registry.getSubclassSheetActions,
    registerSpeciesSheetActions: (rawKey, actions) => species(rawKey, actions, 'registerSpeciesSheetActions'),
    getSpeciesSheetActions: registry.getSpeciesSheetActions,
    registerFeatSheetActions: registry.registerFeatSheetActions,
    getFeatSheetActions: registry.getFeatSheetActions,

    registerClassSheetResources: registry.registerClassSheetResources,
    getClassSheetResources: registry.getClassSheetResources,
    registerSubclassSheetResources: (rawKey, resources) => subclass(rawKey, resources, 'registerSubclassSheetResources'),
    getSubclassSheetResources: registry.getSubclassSheetResources,
    registerSpeciesSheetResources: (rawKey, resources) => species(rawKey, resources, 'registerSpeciesSheetResources'),
    getSpeciesSheetResources: registry.getSpeciesSheetResources,
    registerFeatSheetResources: registry.registerFeatSheetResources,
    getFeatSheetResources: registry.getFeatSheetResources,

    registerClassSheetEffects: registry.registerClassSheetEffects,
    getClassSheetEffects: registry.getClassSheetEffects,
    registerSubclassSheetEffects: (rawKey, effects) => subclass(rawKey, effects, 'registerSubclassSheetEffects'),
    getSubclassSheetEffects: registry.getSubclassSheetEffects,
    registerSpeciesSheetEffects: (rawKey, effects) => species(rawKey, effects, 'registerSpeciesSheetEffects'),
    getSpeciesSheetEffects: registry.getSpeciesSheetEffects,
    registerFeatSheetEffects: registry.registerFeatSheetEffects,
    getFeatSheetEffects: registry.getFeatSheetEffects,

    registerClassRuntimeConfig: registry.registerClassRuntimeConfig,
    getClassRuntimeConfig: registry.getClassRuntimeConfig,
    registerSubclassRuntimeConfig: (rawKey, config) => subclass(rawKey, config, 'registerSubclassRuntimeConfig'),
    getSubclassRuntimeConfig: registry.getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig: (rawKey, config) => species(rawKey, config, 'registerSpeciesRuntimeConfig'),
    getSpeciesRuntimeConfig: registry.getSpeciesRuntimeConfig,

    registerClassSheetChoiceMeta: registry.registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta: registry.getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta: (rawKey, meta) => subclass(rawKey, meta, 'registerSubclassSheetChoiceMeta'),
    getSubclassSheetChoiceMeta: registry.getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta: (rawKey, meta) => species(rawKey, meta, 'registerSpeciesSheetChoiceMeta'),
    getSpeciesSheetChoiceMeta: registry.getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta: (className, meta = {}) => registry.registerClassSheetChoiceMeta(className, meta),
    registerSubclassSheetCommonChoiceMeta: (rawKey, meta = {}) => subclass(rawKey, meta, 'registerSubclassSheetChoiceMeta'),
    registerSpeciesSheetCommonChoiceMeta: (rawKey, meta = {}) => species(rawKey, meta, 'registerSpeciesSheetChoiceMeta'),

    registerItemFlagDef: registry.registerItemFlagDef,
    getItemFlagDef: registry.getItemFlagDef,
    getAllItemFlagDefs: registry.getAllItemFlagDefs,
    registerWeaponAbilityOverride: registry.registerWeaponAbilityOverride,
    getWeaponAbilityOverrides: registry.getWeaponAbilityOverrides,
    registerWeaponExtraAttack: registry.registerWeaponExtraAttack,
    getWeaponExtraAttacks: registry.getWeaponExtraAttacks,
    registerFeatOwnerKey: registry.registerFeatOwnerKey,
    registerFeatOwnerKeyPrefix: registry.registerFeatOwnerKeyPrefix,
    registerFeatOwnerKeyPattern: registry.registerFeatOwnerKeyPattern,
    getFeatOwnerKeyExact: registry.getFeatOwnerKeyExact,
    getFeatOwnerKeyPrefixes: registry.getFeatOwnerKeyPrefixes,
    getFeatOwnerKeyPatterns: registry.getFeatOwnerKeyPatterns,

    registerClassSheetFeatureFilter: registry.registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters: registry.getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter: (rawKey, fn) => subclass(rawKey, fn, 'registerSubclassSheetFeatureFilter'),
    getSubclassSheetFeatureFilters: registry.getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter: (rawKey, fn) => species(rawKey, fn, 'registerSpeciesSheetFeatureFilter'),
    getSpeciesSheetFeatureFilters: registry.getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies: registry.registerClassSheetProficiencies,
    getClassSheetProficiencies: registry.getClassSheetProficiencies,
    registerSubclassSheetProficiencies: (rawKey, grants) => subclass(rawKey, grants, 'registerSubclassSheetProficiencies'),
    getSubclassSheetProficiencies: registry.getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies: (rawKey, grants) => species(rawKey, grants, 'registerSpeciesSheetProficiencies'),
    getSpeciesSheetProficiencies: registry.getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers: registry.registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers: registry.getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers: (rawKey, modifiers) => subclass(rawKey, modifiers, 'registerSubclassSheetSpellModifiers'),
    getSubclassSheetSpellModifiers: registry.getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers: (rawKey, modifiers) => species(rawKey, modifiers, 'registerSpeciesSheetSpellModifiers'),
    getSpeciesSheetSpellModifiers: registry.getSpeciesSheetSpellModifiers,

    registerClassChoiceKeyFilter: registry.registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter: registry.getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider: registry.registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider: registry.getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus: (rawKey, value) => species(rawKey, value, 'registerSpeciesSheetHpBonus'),
    getSpeciesSheetHpBonus: registry.getSpeciesSheetHpBonus,
    registerClassAtWillSpells: registry.registerClassAtWillSpells,
    getClassAtWillSpells: registry.getClassAtWillSpells,
    registerSpeciesLongRestGrants: registry.registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants: registry.getSpeciesLongRestGrants,
    registerResourceSideEffect: registry.registerResourceSideEffect,
    getResourceSideEffect: registry.getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider: registry.registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider: registry.getSubclassChoiceDetailDataProvider,

    registerGlobalClassAdapter: registry.registerGlobalClassAdapter,
    getGlobalClassAdapters: registry.getGlobalClassAdapters,
    registerGlobalSubclassAdapter: registry.registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters: registry.getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter: registry.registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters: registry.getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter: registry.registerGlobalFeatAdapter,
    getGlobalFeatAdapters: registry.getGlobalFeatAdapters,
    registerGlobalSpellAdapter: registry.registerGlobalSpellAdapter,
    getGlobalSpellAdapters: registry.getGlobalSpellAdapters,
    registerGlobalItemAdapter: registry.registerGlobalItemAdapter,
    getGlobalItemAdapters: registry.getGlobalItemAdapters,

    registerCantripData: registry.registerCantripData,
    getCantripData: registry.getCantripData,
    registerCantripDataModifier: registry.registerCantripDataModifier,
    getCantripDataModifiers: registry.getCantripDataModifiers,
    registerSpellData: registry.registerSpellData,
    getSpellData: registry.getSpellData,

    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function title(value) {
  const text = String(value || '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function choiceFromChoose(key, label, type, block, fallback = []) {
  const choose = block?.choose;
  if (!choose && !block?.any && !block?.anyStandard && !block?.anyExotic && !block?.anyTool && !block?.anyArtisansTool && !block?.anyMusicalInstrument) return null;
  const count = Number(choose?.count || block.any || block.anyStandard || block.anyExotic || block.anyTool || block.anyArtisansTool || block.anyMusicalInstrument || 1);
  const from = Array.isArray(choose?.from) ? choose.from.map(title) : fallback.slice();
  return from.length ? { key, label, type, from, count, level: 1 } : null;
}

function getGenericSpeciesChoiceSpecs(species) {
  const specs = [];
  asArray(species?.skillProficiencies).forEach((block, index) => {
    const spec = choiceFromChoose(`species_skill_${index}`, 'Choose Skill', 'skill_choice', block, SKILLS.map((skill) => skill.name));
    if (spec) specs.push(spec);
  });
  asArray(species?.toolProficiencies).forEach((block, index) => {
    const fallback = block?.anyArtisansTool ? ARTISAN_TOOLS : block?.anyMusicalInstrument ? MUSICAL_INSTRUMENTS : ALL_TOOLS;
    const spec = choiceFromChoose(`species_tool_${index}`, 'Choose Tool Proficiency', 'generic_choice', block, fallback);
    if (spec) specs.push(spec);
  });
  asArray(species?.languageProficiencies || species?.languages).forEach((block, index) => {
    const fallback = block?.anyExotic ? EXOTIC_LANGUAGES : STANDARD_LANGUAGES;
    const spec = choiceFromChoose(`species_language_${index}`, 'Language', 'language_choice', block, fallback);
    if (spec) specs.push(spec);
  });
  if (Array.isArray(species?.size) && species.size.length > 1) {
    const sizeMap = { M: 'Medium', S: 'Small' };
    specs.push({ key: 'species_size', label: 'Size', type: 'generic_choice', from: species.size.map((size) => sizeMap[size] || size), count: 1, level: 1 });
  }
  asArray(species?.resist).forEach((block, index) => {
    const spec = choiceFromChoose(`species_resist_${index}`, 'Resistance', 'generic_choice', block, []);
    if (spec) specs.push(spec);
  });
  return specs;
}

function getGenericBackgroundChoiceSpecs(background) {
  const specs = [];
  asArray(background?.skillProficiencies).forEach((block, index) => {
    const spec = choiceFromChoose(`bg_skill_${index}`, 'Background Skill', 'skill_choice', block, SKILLS.map((skill) => skill.name));
    if (spec) specs.push(spec);
  });
  asArray(background?.toolProficiencies).forEach((block, index) => {
    const fallback = block?.anyArtisansTool ? ARTISAN_TOOLS : block?.anyMusicalInstrument ? MUSICAL_INSTRUMENTS : ALL_TOOLS;
    const spec = choiceFromChoose(`bg_tool_${index}`, 'Background Tool', 'generic_choice', block, fallback);
    if (spec) specs.push(spec);
  });
  asArray(background?.languageProficiencies).forEach((block, index) => {
    const fallback = block?.anyExotic ? EXOTIC_LANGUAGES : STANDARD_LANGUAGES;
    const spec = choiceFromChoose(`bg_language_${index}`, 'Background Language', 'language_choice', block, fallback);
    if (spec) specs.push(spec);
  });
  const origin = getGenericBackgroundOriginFeat(background);
  if (origin?.fixed) specs.push({ key: 'bg_origin_feat', label: 'Origin Feat', type: 'feat_fixed', fixed: origin.fixed, level: 1 });
  return specs;
}

function getGenericBackgroundOriginFeat(background) {
  const feats = asArray(background?.feats);
  const first = feats[0];
  if (!first) return null;
  if (typeof first === 'string') return { fixed: first.split('|')[0] };
  const fixedKey = Object.keys(first).find((key) => key !== 'choose' && first[key]);
  if (fixedKey) return { fixed: fixedKey.split('|')[0] };
  if (first.choose) return { categories: first.choose.from || first.choose.category || ['O'] };
  return null;
}

function getGenericBackgroundChoiceMeta() {
  return {
    sectionTitle: 'Background Choices',
    isChoiceKey: (key) => /^bg_/i.test(String(key || '')),
    getLabel: (key) => String(key || '').replace(/^bg_/i, '').replace(/_/g, ' '),
    normalizeChoiceValue: (value) => String(value || '').split('|')[0],
  };
}
