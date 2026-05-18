import { calcMaxHp, getAllFinalScores, getPrimaryClassLevel, getSelectedFeatNames } from './calculations.js';
import { getMod, getFinal } from '../../charsheet/logic/calculations.js';
import { installedRegistry } from '../../../adapters/index.js';
import { getStorageItem, setStorageItem, setStorageJson } from '../../../shared/storage.js';
import { collectAutoGrantedSpells as collectEntityAutoGrantedSpells } from '../spells/spells.js';
import {
  splitTypedProficiencies,
  uniqueProficiencyLabels,
} from '../../../shared/character/typedProficiencies.js';

export function extractSheetData(text) {
  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const tag = doc.getElementById('gb-sheet-payload');
    if (tag?.textContent) {
      const payload = JSON.parse(tag.textContent);
      if (payload?.type === 'gb-sheet-import' && payload.data) return payload.data;
    }
  } catch (_) {}
  const match = text.match(/var\s+d\s*=\s*(\{[\s\S]+\})\s*;\s*var\s+k\s*=/);
  if (match) {
    try { return JSON.parse(match[1]); } catch (_) {}
  }
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

export function patchCharacterField(field, value) {
  const key = '5e_current_char';
  try {
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    current[field] = value;
    localStorage.setItem(key, JSON.stringify(current));
    const charId = localStorage.getItem('gb_active_char_id');
    if (charId) {
      const scopedKey = `gb:char:${charId}:${key}`;
      const scoped = JSON.parse(localStorage.getItem(scopedKey) || '{}');
      scoped[field] = value;
      localStorage.setItem(scopedKey, JSON.stringify(scoped));
    }
  } catch {}
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

export function makeSheetPayload(character, data) {
  character = normalizeProficiencyChoicesForPersistence(character);
  const primaryClassLevel = getPrimaryClassLevel(character);
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
    ...wizardSpellbookNames,
    ...autoGrantedSpells.map((spell) => spell.name),
  ];
  const spellSnapshots = [...new Set(spellNames)]
    .map((name) => {
      const spell = data.spells.find((entry) => entry.name === name);
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
    (actions || []).map((action) => ({
      ...action,
      ownerName, ownerLevel, ownerType,
      healFormula: typeof action.healFormula === 'function'
        ? action.healFormula({ character, ownerLevel })
        : action.healFormula,
      damageFormula: typeof action.damageFormula === 'function'
        ? action.damageFormula({ character, ownerLevel })
        : action.damageFormula,
      damageButtonLabel: typeof action.damageButtonLabel === 'function'
        ? action.damageButtonLabel({ character, ownerLevel })
        : action.damageButtonLabel,
    }))
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
    extraClasses: character.extraClasses || [],
    speciesName: character.speciesName,
    speciesSource: character.speciesSource,
    bgName: character.backgroundName,
    bgSource: character.backgroundSource,
    bgAbility: character.backgroundAbilities,
    bgPattern: character.backgroundPattern || [2, 1],
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
    clsSnapshot: {
      hd: character.cls?.hd,
      proficiency: character.cls?.proficiency || [],
      casterProgression: character.cls?.casterProgression || null,
      preparedSpellsProgression: character.cls?.preparedSpellsProgression || null,
      cantripProgression: character.cls?.cantripProgression || null,
      subclassLevel: character.cls?.subclassLevel || 3,
      subclassTitle: character.cls?.subclassTitle || '',
      startingProficiencies: character.cls?.startingProficiencies || {},
      multiclassProficienciesGained: character.cls?.multiclassProficienciesGained || {},
      startingEquipment: character.cls?.startingEquipment || null,
    },
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
    bgSnapshot: {
      skillProficiencies: character.backgroundObj?.skillProficiencies || [],
      languageProficiencies: character.backgroundObj?.languageProficiencies || [],
      toolProficiencies: character.backgroundObj?.toolProficiencies || [],
      armorProficiencies: character.backgroundObj?.armorProficiencies,
      weaponProficiencies: character.backgroundObj?.weaponProficiencies,
      feats: character.backgroundObj?.feats || [],
      startingEquipment: character.backgroundObj?.startingEquipment || null,
      entries: character.backgroundObj?.entries || [],
    },
    allFeatSnapshots: (data.feats || [])
      .filter((feat) => getSelectedFeatNames(character).includes(feat.name))
      .map((feat) => {
        const adapter = installedRegistry.getFeatAdapter
          ? installedRegistry.getFeatAdapter(feat.name)
          : null;
        const adapted = typeof adapter === 'function' ? (adapter(feat) || {}) : {};
        return {
          name: feat.name,
          source: feat.source,
          category: feat.category,
          categories: feat.categories,
          entries: feat.entries,
          prerequisite: feat.prerequisite,
          armorProficiencies: feat.armorProficiencies,
          weaponProficiencies: feat.weaponProficiencies,
          hpBonusPerLevel: Number(adapted.hpBonusPerLevel || feat.hpBonusPerLevel || 0),
        };
      }),
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
      featActions: getSelectedFeatNames(character).flatMap((feat) => installedRegistry.getFeatSheetActions(feat)),
      featResources: getSelectedFeatNames(character).flatMap((feat) => (installedRegistry.getFeatSheetResources(feat) || []).map(r => ({ ...r, maxComputed: typeof r.max === 'function' ? r.max(character.level, characterMods) : r.max }))),
      featEffects: getSelectedFeatNames(character).flatMap((feat) => installedRegistry.getFeatSheetEffects(feat)),
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
    currency: character.currency || { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 },
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

export function saveCharacter(character, data) {
  const builderCharacter = normalizeProficiencyChoicesForPersistence(character);
  const payload = makeSheetPayload(builderCharacter, data);
  setStorageJson('5e_current_char', payload);
  setStorageJson('5e_inventory', builderCharacter.inventory || []);
  setStorageJson('5e_currency', builderCharacter.currency || {});
  setStorageItem('5e_xp', builderCharacter.xp || 0);
  setStorageJson('5e_builder_state', builderCharacter);

  const charId = getStorageItem('gb_active_char_id');
  if (charId) {
    setStorageJson(`gb:char:${charId}:5e_current_char`, payload);
    setStorageJson(`gb:char:${charId}:5e_builder_state`, builderCharacter);
    setStorageJson(`gb:char:${charId}:5e_inventory`, builderCharacter.inventory || []);
    setStorageJson(`gb:char:${charId}:5e_currency`, builderCharacter.currency || {});
    setStorageItem(`gb:char:${charId}:5e_xp`, builderCharacter.xp || 0);
    try {
      const registry = JSON.parse(localStorage.getItem('gb_char_registry') || '[]');
      const idx = registry.findIndex((e) => e.id === charId);
      if (idx >= 0) {
        registry[idx] = { ...registry[idx], name: builderCharacter.name || registry[idx].name, updatedAt: Date.now() };
      }
      localStorage.setItem('gb_char_registry', JSON.stringify(registry));
    } catch {}
  }

  return payload;
}

function unwrapStructuredSheetPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.type === 'gb-sheet-import' && payload.data && typeof payload.data === 'object') return payload.data;
  if (payload.data && typeof payload.data === 'object' && !payload.className && !payload.clsSnapshot) return payload.data;
  return payload;
}

function isStructuredSheetPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return Boolean(
    payload.className
    || payload.clsSnapshot
    || payload.speciesSnapshot
    || payload.bgSnapshot
    || payload.choices
    || payload.finalScores
  );
}

function buildBuilderStateFromSheetPayload(data) {
  const backgroundName = data.backgroundName || data.bgName || data.bgSnapshot?.name || '';
  const backgroundSource = data.backgroundSource || data.bgSource || data.bgSnapshot?.source || '';
  const speciesName = data.speciesName || data.speciesSnapshot?.name || '';
  const speciesSource = data.speciesSource || data.speciesSnapshot?.source || '';

  const builderState = {
    name: data.name || '',
    level: Number(data.level || 1),
    classLevel: Number(data.classLevel || data.level || 1),
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
    backgroundObj: data.backgroundObj || data.bgSnapshot || null,
    backgroundAbilities: data.backgroundAbilities || data.bgAbility || [],
    backgroundPattern: data.backgroundPattern || data.bgPattern || [2, 1],

    bgName: backgroundName,
    bgSource: backgroundSource,
    bgAbility: data.bgAbility || data.backgroundAbilities || [],
    bgPattern: data.bgPattern || data.backgroundPattern || [2, 1],

    scoreMethod: data.scoreMethod || 'pointbuy',
    hpMode: data.hpMode || 'average',
    hpManualRolls: data.hpManualRolls || {},
    pbScores: data.pbScores || {},
    arrAssign: data.arrAssign || {},
    diceAssign: data.diceAssign || {},
    manualScores: data.manualScores || {},

    choices: data.choices || {},
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
    currency: data.currency || { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 },
    xp: Number(data.xp || 0),
  };

  return normalizeProficiencyChoicesForPersistence(builderState);
}

function updateActiveCharacterStorage(data, builderState) {
  const charId = getStorageItem('gb_active_char_id');
  if (!charId) return;

  setStorageJson(`gb:char:${charId}:5e_current_char`, data);
  setStorageJson(`gb:char:${charId}:5e_builder_state`, builderState);
  setStorageJson(`gb:char:${charId}:5e_inventory`, data.inventory || []);
  setStorageJson(`gb:char:${charId}:5e_currency`, data.currency || {});
  setStorageItem(`gb:char:${charId}:5e_xp`, data.xp || 0);

  try {
    const registry = JSON.parse(localStorage.getItem('gb_char_registry') || '[]');
    const idx = registry.findIndex((entry) => entry.id === charId);
    if (idx >= 0) {
      registry[idx] = {
        ...registry[idx],
        name: data.name || registry[idx].name,
        updatedAt: Date.now(),
      };
      localStorage.setItem('gb_char_registry', JSON.stringify(registry));
    }
  } catch {}
}

export function importSheetPayload(payload, confirmOverwrite = () => true) {
  const data = unwrapStructuredSheetPayload(payload);

  if (!isStructuredSheetPayload(data)) {
    throw new Error('Formato file non riconosciuto: carica un JSON scheda GM-Board strutturato.');
  }

  const hasExisting = getStorageItem('5e_builder_state') != null;
  if (hasExisting && !confirmOverwrite()) return 0;

  const normalizedData = normalizeProficiencyChoicesForPersistence(data);
  const builderState = buildBuilderStateFromSheetPayload(normalizedData);

  setStorageJson('5e_current_char', normalizedData);
  setStorageJson('5e_builder_state', builderState);
  setStorageJson('5e_inventory', normalizedData.inventory || []);
  setStorageJson('5e_currency', normalizedData.currency || {});
  setStorageItem('5e_xp', normalizedData.xp || 0);

  updateActiveCharacterStorage(normalizedData, builderState);

  return 1;
}
