import { collectOwnedFeatNames, withOwnedFeatSnapshots } from '../../../shared/character/progression/selectedFeats.js';
import { adapterRegistry } from '../../../adapters/registry.js';
import { ownerEntries, speciesOwner } from '../../../shared/character/sheet/adapterOwners.js';
import {
  createCharacter as storeCreateCharacter,
  getActiveCharId,
  loadCharacter as storeLoadCharacter,
  saveCharacter as storeSaveCharacter,
  setActiveCharId,
} from '../../../shared/character/profile/store.js';
import { stripRuntimeOnlyCharacterFields } from '../../../shared/character/profile/runtimeFields.js';
import { collectCharacterAutoGrantedSpells } from '../spells/spells.js';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../../../shared/character/inventory/currency.js';
import { enumerateFixedAdditionalSpells } from '../../../shared/character/spells/additionalSpellGrants.js';
import { resolveActionRollers } from '../../../shared/character/dice/rollers.js';
import { asArray } from '../../../shared/lists.js';
import { matchKey, stripSource } from '../../../shared/content/nameKeys.js';
import { ABILITIES } from '../../../shared/content/rulesVocabulary.js';
import { toSnapshot } from '../../../shared/character/spells/spellSnapshots.js';
import { normalizeProficiencyChoicesForPersistence } from './proficiencyPersistence.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { hpBonusPerLevelOf } from '../../../shared/character/combat/hp.js';
import { speciesWithVersion } from '../../../shared/character/progression/speciesVersion.js';
import { DEFAULT_BACKGROUND_PATTERN } from '../../../shared/character/progression/abilityScores.js';

const FEAT_SNAPSHOT_FIELDS = [
  'name',
  'source',
  'category',
  'categories',
  'entries',
  'prerequisite',
  'ability',
  'skillProficiencies',
  'toolProficiencies',
  'languageProficiencies',
  'skillToolLanguageProficiencies',
  'savingThrowProficiencies',
  'expertise',
  'armorProficiencies',
  'weaponProficiencies',
  'resist',
  'immune',
  'vulnerable',
  'senses',
  'additionalSpells',
  'choiceUi',
  'spellGrantOverrides',
];

function pickFields(source, fields) {
  const out = {};
  fields.forEach((field) => {
    if (source[field] !== undefined) out[field] = source[field];
  });
  return out;
}

function makeClassSnapshot(cls = null) {
  if (!cls || typeof cls !== 'object') return null;
  return {
    hd: cls.hd,
    proficiency: cls.proficiency || [],
    casterProgression: cls.casterProgression || null,
    preparedSpellsProgression: cls.preparedSpellsProgression || null,
    cantripProgression: cls.cantripProgression || null,
    subclassLevel: cls.subclassLevel || 3,
    subclassTitle: cls.subclassTitle || '',
    startingProficiencies: cls.startingProficiencies || {},
    multiclassProficienciesGained: cls.multiclassProficienciesGained || {},
    startingEquipment: cls.startingEquipment || null,
    // A class skin (World of Warcraft): the class whose rules it follows, the
    // base-class features it replaces, and the spells its own features give.
    ruleClass: cls.ruleClass || null,
    removedFeatures: cls.removedFeatures || [],
    isHero: Boolean(cls.isHero),
    skinAdditionalSpells: cls.skinAdditionalSpells || [],
  };
}

// The chosen subclass's own spell list, kept on the sheet (autoGrantedSpells
// subclassDataSpells) — the builder's subclass records are not saved.
function selectedSubclassSpells(entry) {
  const record = (entry?.subclasses || []).find((sub) => sub?.shortName === entry?.subclassShortName);
  return Array.isArray(record?.additionalSpells) ? record.additionalSpells : (entry?.subclassAdditionalSpells || []);
}

// The optional features the character picked (invocations…) that grant spells,
// with their data: the sheet reads their spells from it (autoGrantedSpells.js
// enumerateOptionalFeatureGrants), the way it reads feats' from allFeatSnapshots.
function pickedOptionalFeatureSnapshots(character, optionalFeatures) {
  const picked = new Set(Object.values(character?.choices || {})
    .flatMap((value) => asArray(value))
    .filter((value) => typeof value === 'string')
    .map((value) => matchKey(stripSource(value))));
  return asArray(optionalFeatures)
    .filter((feature) => feature?.additionalSpells?.length && picked.has(matchKey(feature.name)))
    .map(({ name, source, featureType, additionalSpells }) => ({ name, source, featureType, additionalSpells }));
}

function serializeExtraClass(extra = {}) {
  const source = extra && typeof extra === 'object' ? extra : {};
  const classFeatures = Array.isArray(source.allFeatures) && source.allFeatures.length
    ? source.allFeatures
    : (source.allClassFeatures || []);

  return {
    ...source,
    subclassAdditionalSpells: selectedSubclassSpells(source),
    clsSnapshot: source.cls ? makeClassSnapshot(source.cls) : (source.clsSnapshot || null),
    allClassFeatures: classFeatures,
    allSubFeatures: source.allSubFeatures || [],
  };
}

export function makeSheetPayload(character, data) {
  character = normalizeProficiencyChoicesForPersistence(character);
  character = withOwnedFeatSnapshots(character, data.feats);
  const primaryLevel = primaryClassLevel(character);
  // The species as the character has it: the chosen lineage or colour applied.
  const species = speciesWithVersion(character.speciesObj, character.choices);
  const ownedFeatNames = collectOwnedFeatNames(character);
  const ownedFeatSnapshots = character.allFeatSnapshots
    .map((feat) => {
      const adapter = adapterRegistry.getFeatAdapter
        ? adapterRegistry.getFeatAdapter(feat.name)
        : null;
      const adapted = typeof adapter === 'function' ? (adapter(feat) || {}) : {};
      return {
        ...pickFields(feat, FEAT_SNAPSHOT_FIELDS),
        ...pickFields(adapted, FEAT_SNAPSHOT_FIELDS),
        hpBonusPerLevel: hpBonusPerLevelOf(adapterRegistry.getFeatSheetEffects(feat.name)),
      };
    });
  const fixedFeatSpellNames = ownedFeatSnapshots.flatMap((feat) => {
    const slotKey = Object.entries(character.choices || {}).find(([, value]) => (
      typeof value === 'string' && value.toLowerCase() === feat.name.toLowerCase()
    ))?.[0];
    return enumerateFixedAdditionalSpells(feat.additionalSpells, {
      entryIndex: slotKey ? character.choices?.[`${slotKey}_entry`] : null,
      spellOverrides: feat.spellGrantOverrides,
    }).map((grant) => grant.name);
  });
  const selectedSpellLevels = new Map();
  (character.selectedCantrips || []).forEach((name) => selectedSpellLevels.set(name, 0));
  Object.entries(character.selectedSpells || {}).forEach(([level, names]) => {
    (names || []).forEach((name) => selectedSpellLevels.set(name, Number(level)));
  });
  (character.extraClasses || []).forEach((extra) => {
    (extra.selectedCantrips || []).forEach((name) => selectedSpellLevels.set(name, 0));
    Object.entries(extra.selectedSpells || {}).forEach(([level, names]) => {
      (names || []).forEach((name) => selectedSpellLevels.set(name, Number(level)));
    });
  });

  const wizardSpellbookNames = [];
  const addWizardSpellbookNames = (book) => {
    Object.entries(book || {}).forEach(([level, names]) => {
      (names || []).forEach((entry) => {
        const name = typeof entry === 'string' ? entry : entry?.name;
        if (!name) return;
        wizardSpellbookNames.push(name);
        selectedSpellLevels.set(name, Number(level || 0));
      });
    });
  };
  addWizardSpellbookNames(character.wizardSpellbook);
  (character.extraClasses || []).forEach((extra) => addWizardSpellbookNames(extra.wizardSpellbook));

  const choiceSpellNames = [];
  Object.entries(character.choices || {}).forEach(([key, value]) => {
    const values = asArray(value);
    values.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const name = stripSource(entry);
      if (!name) return;
      const knownSpell = data.spells.some((spell) => spell.name === name);
      const spellChoiceKey = /(spell|cantrip|tome|magical|known|prepared|innate|expanded)/i.test(key);
      if ((knownSpell || spellChoiceKey) && !ABILITIES.includes(name.toLowerCase())) choiceSpellNames.push(name);
    });
  });
  const autoGrantedSpells = collectCharacterAutoGrantedSpells(character);
  const spellNames = [
    ...(character.selectedCantrips || []),
    ...Object.values(character.selectedSpells || {}).flat(),
    ...(character.extraClasses || []).flatMap((extra) => [
      ...(extra.selectedCantrips || []),
      ...Object.values(extra.selectedSpells || {}).flat(),
    ]),
    ...choiceSpellNames,
    ...fixedFeatSpellNames,
    ...wizardSpellbookNames,
    ...autoGrantedSpells.map((spell) => spell.name),
  ];
  const spellSnapshots = [...new Set(spellNames)]
    .map((name) => {
      const spell = data.spells.find((entry) => (
        String(entry.name || '').toLowerCase() === String(name || '').toLowerCase()
      ));
      if (spell) return spell;
      return { name, level: selectedSpellLevels.get(name) ?? autoGrantedSpells.find((entry) => entry.name === name)?.level ?? 0 };
    })
    .map((spell) => toSnapshot({ ...spell, level: Number(spell.level ?? selectedSpellLevels.get(spell.name) ?? 0) }));

  const annotateActions = (actions, ownerName, ownerLevel, ownerType) => (
    (actions || []).map((action) => ({
      ...action,
      ownerName, ownerLevel, ownerType,
      rollers: resolveActionRollers(action, { character, ownerLevel }),
    }))
  );
  const annotateResources = (resources, ownerName, ownerLevel, ownerType) => (
    (resources || []).map((resource) => ({
      ...resource,
      ownerName,
      ownerLevel,
      ownerType,
    }))
  );
  const extraClasses = character.extraClasses || [];
  const runtimeClassActions = [
    ...annotateActions(adapterRegistry.getClassSheetActions(character.className), character.className, primaryLevel, 'class'),
    ...extraClasses.flatMap((extra) => annotateActions(adapterRegistry.getClassSheetActions(extra.name), extra.name, Number(extra.level || 1), 'class')),
  ];
  const runtimeClassResources = [
    ...annotateResources(adapterRegistry.getClassSheetResources(character.className), character.className, primaryLevel, 'class'),
    ...extraClasses.flatMap((extra) => annotateResources(adapterRegistry.getClassSheetResources(extra.name), extra.name, Number(extra.level || 1), 'class')),
  ];
  const runtimeSubclassActions = [
    ...annotateActions(adapterRegistry.getSubclassSheetActions(character.className, character.subclassShortName), character.subclassShortName || character.className, primaryLevel, 'subclass'),
    ...extraClasses.flatMap((extra) => annotateActions(adapterRegistry.getSubclassSheetActions(extra.name, extra.subclassShortName), extra.subclassShortName || extra.name, Number(extra.level || 1), 'subclass')),
  ];
  const runtimeSubclassResources = [
    ...annotateResources(adapterRegistry.getSubclassSheetResources(character.className, character.subclassShortName), character.subclassShortName || character.className, primaryLevel, 'subclass'),
    ...extraClasses.flatMap((extra) => annotateResources(adapterRegistry.getSubclassSheetResources(extra.name, extra.subclassShortName), extra.subclassShortName || extra.name, Number(extra.level || 1), 'subclass')),
  ];

  return {
    name: character.name,
    level: character.level,
    classLevel: primaryLevel,
    className: character.className,
    classSource: character.classSource,
    subclassShortName: character.subclassShortName || null,
    subclassAdditionalSpells: selectedSubclassSpells(character),
    subclassSource: character.subclassSource || null,
    extraClasses: (character.extraClasses || []).map(serializeExtraClass),
    speciesName: character.speciesName,
    speciesSource: character.speciesSource,
    backgroundName: character.backgroundName,
    backgroundSource: character.backgroundSource,
    // The selectable books the character is built from (none saved = all).
    ...(Array.isArray(character.books) ? { books: character.books.slice() } : {}),
    backgroundAbilities: character.backgroundAbilities,
    backgroundPattern: character.backgroundPattern || [...DEFAULT_BACKGROUND_PATTERN],
    scoreMethod: character.scoreMethod,
    hpMode: character.hpMode || 'average',
    hpManualRolls: { ...(character.hpManualRolls || {}) },
    pbScores: { ...character.pbScores },
    arrAssign: { ...character.arrAssign },
    diceAssign: { ...character.diceAssign },
    manualScores: { ...character.manualScores },
    choices: { ...(character.choices || {}) },
    normalizedChoices: character.normalizedChoices || null,
    selectedSkills: character.selectedSkills || [],
    selectedLanguages: character.selectedLanguages || [],
    selectedTools: character.selectedTools || [],
    clsSnapshot: character.cls ? makeClassSnapshot(character.cls) : (character.clsSnapshot || null),
    speciesSnapshot: {
      name: character.speciesName,
      speed: species?.speed || 30,
      size: species?.size || ['M'],
      darkvision: species?.darkvision || 0,
      resist: species?.resist || [],
      immune: species?.immune || [],
      // The species' spells as its data grants them (the lineage's, once chosen).
      additionalSpells: species?.additionalSpells || [],
      versionName: species?.versionName || null,
      languageProficiencies: [{ common: true }, ...(character.speciesObj?.languageProficiencies || [])],
      toolProficiencies: character.speciesObj?.toolProficiencies || [],
      armorProficiencies: character.speciesObj?.armorProficiencies,
      weaponProficiencies: character.speciesObj?.weaponProficiencies,
      entries: character.speciesObj?.entries || [],
      hpBonusPerLevel: hpBonusPerLevelOf(ownerEntries(speciesOwner(character), 'SheetEffects')),
      copiedFrom: character.speciesObj?.copiedFrom || null,
    },
    backgroundSnapshot: {
      skillProficiencies: character.backgroundObj?.skillProficiencies || [],
      languageProficiencies: character.backgroundObj?.languageProficiencies || [],
      toolProficiencies: character.backgroundObj?.toolProficiencies || [],
      armorProficiencies: character.backgroundObj?.armorProficiencies,
      weaponProficiencies: character.backgroundObj?.weaponProficiencies,
      feats: character.backgroundObj?.feats || [],
      startingEquipment: character.backgroundObj?.startingEquipment || null,
      entries: character.backgroundObj?.entries || [],
    },
    allFeatSnapshots: ownedFeatSnapshots,
    optionalFeatureSnapshots: pickedOptionalFeatureSnapshots(character, data?.optionalFeatures),
    allClassFeatures: character.allFeatures || [],
    allSubFeatures: character.allSubFeatures || [],
    adapterRuntime: {
      classActions: runtimeClassActions,
      classResources: runtimeClassResources,
      classEffects: adapterRegistry.getClassSheetEffects(character.className),
      subclassActions: runtimeSubclassActions,
      subclassResources: runtimeSubclassResources,
      subclassEffects: adapterRegistry.getSubclassSheetEffects(character.className, character.subclassShortName),
      speciesActions: annotateActions(
        ownerEntries(speciesOwner(character), 'SheetActions'),
        character.speciesName,
        Number(character.level || 1),
        'species',
      ),
      speciesResources: ownerEntries(speciesOwner(character), 'SheetResources') || [],
      speciesEffects: ownerEntries(speciesOwner(character), 'SheetEffects'),
      featActions: ownedFeatNames.flatMap((feat) => annotateActions(
        adapterRegistry.getFeatSheetActions(feat),
        feat,
        Number(character.level || 1),
        'feat',
      )),
      featResources: ownedFeatNames.flatMap((feat) => adapterRegistry.getFeatSheetResources(feat) || []),
      featEffects: ownedFeatNames.flatMap((feat) => adapterRegistry.getFeatSheetEffects(feat)),
    },
    selectedCantrips: character.selectedCantrips || [],
    selectedSpells: character.selectedSpells || {},
    wizardSpellbook: character.wizardSpellbook || {},
    wizardSpellMastery: character.wizardSpellMastery || {},
    wizardSignatureSpells: character.wizardSignatureSpells || {},
    autoGrantedSpells,
    xp: character.xp || 0,
    inventory: character.inventory || [],
    currency: normalizeCurrency(character.currency || { ...DEFAULT_CURRENCY }),
    equipChoices: character.equipChoices || {},
    grantSpellNames: choiceSpellNames,
    spellSnapshots,
    classIconColor: character.classIconColor || null,
  };
}

const HEAVY_BUILDER_FIELDS = [
  'cls', 'speciesObj', 'backgroundObj',
  'allFeatures',
  'subclasses', 'dicePool',
];

// The builder-only working objects (full class/species/background records,
// feature lists, the dice pool) never persisted with the character.
export function stripHeavyFields(character) {
  const out = { ...character };
  HEAVY_BUILDER_FIELDS.forEach((key) => { delete out[key]; });
  if (Array.isArray(out.extraClasses)) {
    out.extraClasses = out.extraClasses.map((extra) => {
      const trimmed = { ...extra };
      HEAVY_BUILDER_FIELDS.forEach((key) => { delete trimmed[key]; });
      return trimmed;
    });
  }
  return out;
}

// Build the unified character object persisted to the store/cloud, WITHOUT
// writing anywhere. `previous` is merged first so sheet-only fields (HP,
// resources, roll log, ...) added outside the builder survive a builder re-save.
export function buildSheetCharacter(character, data, previous = {}) {
  const builderCharacter = normalizeProficiencyChoicesForPersistence(character);
  const payload = makeSheetPayload(builderCharacter, data);
  // `previous` (a stored or cloud row) may still carry runtime-only fields from
  // before they were stripped; they never survive a builder save.
  return stripRuntimeOnlyCharacterFields(stripHeavyFields({ ...(previous || {}), ...builderCharacter, ...payload }));
}

export function saveCharacter(character, data, options = {}) {
  const { createIfMissing = true } = options;
  let id = options.id || getActiveCharId();
  const existing = id ? storeLoadCharacter(id) : null;
  if (!id && !createIfMissing) return null;
  if (id && !existing && !createIfMissing) return null;
  const unified = buildSheetCharacter(character, data, existing || {});
  if (!id) {
    const created = storeCreateCharacter(unified);
    id = created.id;
    setActiveCharId(id);
    return created;
  }
  return storeSaveCharacter(id, unified);
}

