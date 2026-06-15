import { calcMaxHp, getAllFinalScores, getPrimaryClassLevel } from './calculations.js';
import { collectOwnedFeatNames } from '../../../shared/character/selectedFeats.js';
import { getMod, getFinal } from '../../charsheet/logic/calculations.js';
import { installedRegistry } from '../../../adapters/index.js';
import {
  createCharacter as storeCreateCharacter,
  getActiveCharId,
  loadCharacter as storeLoadCharacter,
  saveCharacter as storeSaveCharacter,
  setActiveCharId,
} from '../../../shared/character/store.js';
import { collectAutoGrantedSpells as collectEntityAutoGrantedSpells } from '../spells/spells.js';
import { normalizeCurrency } from '../../../shared/character/currency.js';
import {
  splitTypedProficiencies,
  uniqueProficiencyLabels,
} from '../../../shared/character/typedProficiencies.js';
import { enumerateFixedAdditionalSpells } from '../../../shared/character/additionalSpellGrants.js';

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

export function extractSheetData(text) {
  // Canonical export is a JSON file: { type, data, version } (or a bare character).
  try {
    const json = JSON.parse(text);
    return json?.data || json;
  } catch (_) {
    return null;
  }
}


function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function collectTypedProficiencyChoices(choices = {}) {
  const all = Object.values(choices || {}).flatMap(asArray);
  const split = splitTypedProficiencies(all);
  return {
    skills: uniqueProficiencyLabels(split.skill),
    tools: uniqueProficiencyLabels(split.tool),
    languages: uniqueProficiencyLabels(split.language),
  };
}

function mergeSelectedSkills(selectedSkills, addedSkills) {
  const additions = uniqueProficiencyLabels(addedSkills);
  if (!additions.length) return selectedSkills || [];

  if (selectedSkills && !Array.isArray(selectedSkills) && typeof selectedSkills === 'object') {
    return {
      ...selectedSkills,
      proficient: uniqueProficiencyLabels([...(selectedSkills.proficient || []), ...additions]),
    };
  }

  return uniqueProficiencyLabels([...(Array.isArray(selectedSkills) ? selectedSkills : []), ...additions]);
}

function mergeSelectedList(current, additions) {
  const added = uniqueProficiencyLabels(additions);
  if (!added.length) return Array.isArray(current) ? current : [];
  return uniqueProficiencyLabels([...(Array.isArray(current) ? current : []), ...added]);
}

function mergeNormalizedChoices(normalizedChoices, typedProfs) {
  const hasTyped = typedProfs.skills.length || typedProfs.tools.length || typedProfs.languages.length;
  if (!normalizedChoices && !hasTyped) return null;

  const normalized = normalizedChoices && typeof normalizedChoices === 'object'
    ? { ...normalizedChoices }
    : {};

  normalized.skills = uniqueProficiencyLabels([...(normalized.skills || []), ...typedProfs.skills]);
  normalized.tools = uniqueProficiencyLabels([...(normalized.tools || []), ...typedProfs.tools]);
  normalized.languages = uniqueProficiencyLabels([...(normalized.languages || []), ...typedProfs.languages]);

  return normalized;
}

function normalizeProficiencyChoicesForPersistence(character = {}) {
  const typedProfs = collectTypedProficiencyChoices(character.choices || {});

  return {
    ...character,
    selectedSkills: mergeSelectedSkills(character.selectedSkills, typedProfs.skills),
    selectedTools: mergeSelectedList(character.selectedTools, typedProfs.tools),
    selectedLanguages: mergeSelectedList(character.selectedLanguages, typedProfs.languages),
    normalizedChoices: mergeNormalizedChoices(character.normalizedChoices, typedProfs),
  };
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
  };
}

function serializeExtraClass(extra = {}) {
  const source = extra && typeof extra === 'object' ? extra : {};
  const classFeatures = Array.isArray(source.allFeatures) && source.allFeatures.length
    ? source.allFeatures
    : (source.allClassFeatures || []);

  return {
    ...source,
    clsSnapshot: source.cls ? makeClassSnapshot(source.cls) : (source.clsSnapshot || null),
    allClassFeatures: classFeatures,
    allSubFeatures: source.allSubFeatures || [],
  };
}

export function makeSheetPayload(character, data) {
  character = normalizeProficiencyChoicesForPersistence(character);
  const primaryClassLevel = getPrimaryClassLevel(character);
  const ownedFeatNames = collectOwnedFeatNames(character);
  const ownedFeatSnapshots = (data.feats || [])
    .filter((feat) => ownedFeatNames.includes(feat.name))
    .map((feat) => {
      const adapter = installedRegistry.getFeatAdapter
        ? installedRegistry.getFeatAdapter(feat.name)
        : null;
      const adapted = typeof adapter === 'function' ? (adapter(feat) || {}) : {};
      return {
        ...pickFields(feat, FEAT_SNAPSHOT_FIELDS),
        ...pickFields(adapted, FEAT_SNAPSHOT_FIELDS),
        hpBonusPerLevel: Number(adapted.hpBonusPerLevel || feat.hpBonusPerLevel || 0),
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
    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const name = entry.split('|')[0].trim();
      if (!name) return;
      const knownSpell = data.spells.some((spell) => spell.name === name);
      const spellChoiceKey = /(spell|cantrip|tome|magical|known|prepared|innate|expanded)/i.test(key);
      if ((knownSpell || spellChoiceKey) && !['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(name.toLowerCase())) choiceSpellNames.push(name);
    });
  });
  const autoGrantedSpells = collectAutoGrantedSpells(character);
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
    .map((spell) => ({
      name: spell.name,
      level: Number(spell.level ?? selectedSpellLevels.get(spell.name) ?? 0),
      school: spell.school,
      source: spell.source,
      components: spell.components,
      duration: spell.duration,
      range: spell.range,
      time: spell.time,
      ritual: spell.ritual,
      concentration: spell.concentration,
      entries: spell.entries,
      entriesHigherLevel: spell.entriesHigherLevel || null,
      descriptionEntries: spell.descriptionEntries || spell.entries || [],
      higherLevelEntries: spell.higherLevelEntries || spell.entriesHigherLevel || null,
      castingTimeLabel: spell.castingTimeLabel || spell.castingTime || null,
      rangeLabel: spell.rangeLabel || spell.rangeText || null,
      componentsLabel: spell.componentsLabel || null,
      materialLabel: spell.materialLabel || null,
      durationLabel: spell.durationLabel || spell.durationText || null,
      scalingLevelDice: spell.scalingLevelDice || null,
      spellAttack: spell.spellAttack || null,
      damageInflict: spell.damageInflict || null,
    }));

  const annotateActions = (actions, ownerName, ownerLevel, ownerType) => (
    (actions || []).map((action) => {
      const rollFormula = typeof action.rollFormula === 'function'
        ? action.rollFormula({ character, ownerLevel })
        : action.rollFormula;
      return {
        ...action,
        ownerName, ownerLevel, ownerType,
        healFormula: typeof action.healFormula === 'function'
          ? action.healFormula({ character, ownerLevel })
          : action.healFormula,
        rollFormula,
        // Resolve the curated label with the rolled formula in scope so values
        // like "2d6 thunder" / "Smite 5d8 Force" serialize correctly (functions
        // can't be persisted). Must come after rollFormula is resolved.
        rollButtonLabel: typeof action.rollButtonLabel === 'function'
          ? action.rollButtonLabel({ character, ownerLevel, formula: rollFormula })
          : action.rollButtonLabel,
      };
    })
  );
  const characterMods = {};
  ['str','dex','con','int','wis','cha'].forEach(stat => {
    characterMods[stat] = Number(getMod(getFinal(character, stat)) || 0);
  });
  const annotateResources = (resources, ownerName, ownerLevel, ownerType) => (
    (resources || []).map((resource) => ({
      ...resource,
      ownerName,
      ownerLevel,
      ownerType,
      maxComputed: typeof resource.max === 'function' ? resource.max(ownerLevel, characterMods) : resource.max,
    }))
  );
  const extraClasses = character.extraClasses || [];
  const runtimeClassActions = [
    ...annotateActions(installedRegistry.getClassSheetActions(character.className), character.className, primaryClassLevel, 'class'),
    ...extraClasses.flatMap((extra) => annotateActions(installedRegistry.getClassSheetActions(extra.name), extra.name, Number(extra.level || 1), 'class')),
  ];
  const runtimeClassResources = [
    ...annotateResources(installedRegistry.getClassSheetResources(character.className), character.className, primaryClassLevel, 'class'),
    ...extraClasses.flatMap((extra) => annotateResources(installedRegistry.getClassSheetResources(extra.name), extra.name, Number(extra.level || 1), 'class')),
  ];
  const runtimeSubclassActions = [
    ...annotateActions(installedRegistry.getSubclassSheetActions(character.className, character.subclassShortName), character.subclassShortName || character.className, primaryClassLevel, 'subclass'),
    ...extraClasses.flatMap((extra) => annotateActions(installedRegistry.getSubclassSheetActions(extra.name, extra.subclassShortName), extra.subclassShortName || extra.name, Number(extra.level || 1), 'subclass')),
  ];
  const runtimeSubclassResources = [
    ...annotateResources(installedRegistry.getSubclassSheetResources(character.className, character.subclassShortName), character.subclassShortName || character.className, primaryClassLevel, 'subclass'),
    ...extraClasses.flatMap((extra) => annotateResources(installedRegistry.getSubclassSheetResources(extra.name, extra.subclassShortName), extra.subclassShortName || extra.name, Number(extra.level || 1), 'subclass')),
  ];

  return {
    name: character.name,
    level: character.level,
    classLevel: primaryClassLevel,
    className: character.className,
    classSource: character.classSource,
    subclassShortName: character.subclassShortName || null,
    subclassSource: character.subclassSource || null,
    extraClasses: (character.extraClasses || []).map(serializeExtraClass),
    speciesName: character.speciesName,
    speciesSource: character.speciesSource,
    backgroundName: character.backgroundName,
    backgroundSource: character.backgroundSource,
    backgroundAbilities: character.backgroundAbilities,
    backgroundPattern: character.backgroundPattern || [2, 1],
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
      speed: character.speciesObj?.speed || 30,
      size: character.speciesObj?.size || ['M'],
      darkvision: character.speciesObj?.darkvision || 0,
      resist: character.speciesObj?.resist || [],
      immune: character.speciesObj?.immune || [],
      languageProficiencies: [{ common: true }, ...(character.speciesObj?.languageProficiencies || [])],
      toolProficiencies: character.speciesObj?.toolProficiencies || [],
      armorProficiencies: character.speciesObj?.armorProficiencies,
      weaponProficiencies: character.speciesObj?.weaponProficiencies,
      entries: character.speciesObj?.entries || [],
      hpBonusPerLevel: Number(installedRegistry.getSpeciesSheetHpBonus
        ? installedRegistry.getSpeciesSheetHpBonus(character.speciesName, character.speciesSource) || 0
        : 0),
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
    allClassFeatures: character.allFeatures || [],
    allSubFeatures: character.allSubFeatures || [],
    adapterRuntime: {
      classActions: runtimeClassActions,
      classResources: runtimeClassResources,
      classEffects: installedRegistry.getClassSheetEffects(character.className),
      subclassActions: runtimeSubclassActions,
      subclassResources: runtimeSubclassResources,
      subclassEffects: installedRegistry.getSubclassSheetEffects(character.className, character.subclassShortName),
      speciesActions: installedRegistry.getSpeciesSheetActions(character.speciesName, character.speciesSource),
      speciesResources: (installedRegistry.getSpeciesSheetResources(character.speciesName, character.speciesSource) || []).map(r => ({ ...r, maxComputed: typeof r.max === 'function' ? r.max(character.level, characterMods) : r.max })),
      speciesEffects: installedRegistry.getSpeciesSheetEffects(character.speciesName, character.speciesSource),
      featActions: ownedFeatNames.flatMap((feat) => installedRegistry.getFeatSheetActions(feat)),
      featResources: ownedFeatNames.flatMap((feat) => (installedRegistry.getFeatSheetResources(feat) || []).map(r => ({ ...r, maxComputed: typeof r.max === 'function' ? r.max(character.level, characterMods) : r.max }))),
      featEffects: ownedFeatNames.flatMap((feat) => installedRegistry.getFeatSheetEffects(feat)),
    },
    selectedCantrips: character.selectedCantrips || [],
    selectedSpells: character.selectedSpells || {},
    wizardSpellbook: character.wizardSpellbook || {},
    wizardSpellMastery: character.wizardSpellMastery || {},
    wizardSignatureSpells: character.wizardSignatureSpells || {},
    autoGrantedSpells,
    xp: character.xp || 0,
    maxHp: calcMaxHp(character),
    finalScores: getAllFinalScores(character),
    inventory: character.inventory || [],
    currency: normalizeCurrency(character.currency || { cp: 0, sp: 0, gp: 10, pp: 0 }),
    equipChoices: character.equipChoices || {},
    grantSpellNames: choiceSpellNames,
    spellSnapshots,
    classIconColor: character.classIconColor || null,
  };
}

function collectAutoGrantedSpells(character) {
  const primaryLevel = getPrimaryClassLevel(character);
  const entities = [
    { ...character, classLevel: primaryLevel },
    ...(character.extraClasses || []).map((extra) => ({
      ...character,
      className: extra.name,
      classSource: extra.source,
      classLevel: Number(extra.level || 1),
      level: Number(extra.level || 1),
      cls: extra.cls,
      subclassShortName: extra.subclassShortName || '',
      allSubFeatures: extra.allSubFeatures || [],
      extraClasses: [],
    })),
  ];
  const out = [];
  entities.forEach((entity) => {
    collectEntityAutoGrantedSpells(entity).forEach((spell) => {
      const key = `${String(spell.name || '').toLowerCase()}-${spell.source || ''}`;
      if (!spell.name || out.some((entry) => `${String(entry.name || '').toLowerCase()}-${entry.source || ''}` === key)) return;
      out.push(spell);
    });
  });
  return out;
}

const HEAVY_BUILDER_FIELDS = [
  'cls', 'speciesObj', 'backgroundObj',
  'allFeatures',
  'subclasses', 'dicePool',
];

function stripHeavyFields(character) {
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

export function saveCharacter(character, data) {
  const builderCharacter = normalizeProficiencyChoicesForPersistence(character);
  const payload = makeSheetPayload(builderCharacter, data);
  const existing = storeLoadCharacter(getActiveCharId()) || {};
  const unified = stripHeavyFields({ ...existing, ...builderCharacter, ...payload });
  let id = getActiveCharId();
  if (!id) {
    const created = storeCreateCharacter(unified);
    id = created.id;
    setActiveCharId(id);
    return created;
  }
  return storeSaveCharacter(id, unified);
}

function unwrapStructuredSheetPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  // Tolerate a still-wrapped { data } payload; a real character carries className.
  if (payload.data && typeof payload.data === 'object' && !payload.className) return payload.data;
  return payload;
}

function isStructuredSheetPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return Boolean(payload.className || payload.choices);
}

function buildBuilderStateFromSheetPayload(data) {
  const backgroundSnapshot = data.backgroundSnapshot || null;
  const backgroundName = data.backgroundName || backgroundSnapshot?.name || '';
  const backgroundSource = data.backgroundSource || backgroundSnapshot?.source || '';
  const backgroundAbilities = data.backgroundAbilities || [];
  const backgroundPattern = data.backgroundPattern || [2, 1];
  const speciesName = data.speciesName || data.speciesSnapshot?.name || '';
  const speciesSource = data.speciesSource || data.speciesSnapshot?.source || '';

  const builderState = {
    name: data.name || '',
    level: Number(data.level || 1),
    classLevel: getPrimaryClassLevel(data),
    className: data.className || data.clsSnapshot?.name || '',
    classSource: data.classSource || data.clsSnapshot?.source || '',
    subclassShortName: data.subclassShortName || '',
    subclassSource: data.subclassSource || '',
    extraClasses: data.extraClasses || [],

    speciesName,
    speciesSource,
    speciesObj: data.speciesObj || data.speciesSnapshot || null,

    backgroundName,
    backgroundSource,
    backgroundObj: data.backgroundObj || backgroundSnapshot,
    backgroundAbilities,
    backgroundPattern,

    scoreMethod: data.scoreMethod || 'pointbuy',
    hpMode: data.hpMode || 'average',
    hpManualRolls: data.hpManualRolls || {},
    pbScores: data.pbScores || {},
    arrAssign: data.arrAssign || {},
    diceAssign: data.diceAssign || {},
    manualScores: data.manualScores || {},

    choices: data.choices || {},
    equipChoices: data.equipChoices || {},
    normalizedChoices: data.normalizedChoices || null,
    selectedSkills: data.selectedSkills || [],
    selectedLanguages: data.selectedLanguages || [],
    selectedTools: data.selectedTools || [],

    cls: data.cls || data.clsSnapshot || null,
    clsSnapshot: data.clsSnapshot || data.cls || null,
    allFeatures: data.allFeatures || data.allClassFeatures || [],
    allClassFeatures: data.allClassFeatures || data.allFeatures || [],
    allSubFeatures: data.allSubFeatures || [],
    allFeatSnapshots: data.allFeatSnapshots || [],

    selectedCantrips: data.selectedCantrips || [],
    selectedSpells: data.selectedSpells || {},
    wizardSpellbook: data.wizardSpellbook || {},
    wizardSpellMastery: data.wizardSpellMastery || {},
    wizardSignatureSpells: data.wizardSignatureSpells || {},
    autoGrantedSpells: data.autoGrantedSpells || [],

    inventory: data.inventory || [],
    currency: normalizeCurrency(data.currency || { cp: 0, sp: 0, gp: 10, pp: 0 }),
    xp: Number(data.xp || 0),
  };

  return normalizeProficiencyChoicesForPersistence(builderState);
}

export function importSheetPayload(payload, confirmOverwrite = () => true) {
  const data = unwrapStructuredSheetPayload(payload);

  if (!isStructuredSheetPayload(data)) {
    throw new Error('Formato file non riconosciuto: carica un JSON scheda GM-Board strutturato.');
  }

  const activeId = getActiveCharId();
  const hasExisting = activeId && storeLoadCharacter(activeId) != null;
  if (hasExisting && !confirmOverwrite()) return 0;

  const normalizedData = normalizeProficiencyChoicesForPersistence(data);
  const builderState = buildBuilderStateFromSheetPayload(normalizedData);
  const unified = stripHeavyFields({ ...builderState, ...normalizedData });

  if (activeId) storeSaveCharacter(activeId, unified);
  else {
    const created = storeCreateCharacter(unified);
    setActiveCharId(created.id);
  }

  return 1;
}
