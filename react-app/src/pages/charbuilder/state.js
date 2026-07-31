import {
  BACKGROUND_SUMMARIES,
  CLASS_SUMMARIES,
  FEAT_SUMMARIES,
  ITEM_SUMMARIES,
  SPECIES_SUMMARIES,
  STANDARD_ARRAY,
  STATS,
} from './constants.js';
import { getBackgroundPattern, getPrimaryClassLevel } from './logic/calculations.js';
import { handleBackgroundSelect, handleClassSelect, handleSpellToggle, handleWizardSpellbookToggle } from './stateHandlers.js';
import { getChoiceLevel } from '../../shared/character/choiceLevels.js';
import {
  normalizeCoinAmount,
  setCoinAmount,
  addCustomCurrency,
  updateCustomCurrency,
  removeCustomCurrency,
  reorderCurrency,
} from '../../shared/character/currency.js';
import { addInventoryEntries } from '../../shared/character/itemContainers.js';
import { emptyItemFilters } from '../../shared/character/itemFilters.js';
import { isFeatKey, isFeatDetailKey } from '../../shared/featChoiceKeys.js';
import { normalizeCharacterChoices } from '../../shared/choiceNormalization.js';

// Fields whose value feeds normalizeCharacterChoices. When a reducer patch touches
// any of them, normalizedChoices is rebuilt so it stays the single source of truth
// for derived proficiencies/expertise/spells (consumed by the sheet and previews).
const NORMALIZE_SOURCE_FIELDS = [
  'choices',
  'selectedSkills',
  'selectedTools',
  'selectedLanguages',
  'selectedCantrips',
  'selectedSpells',
  'wizardSpellbook',
  'wizardSpellMastery',
  'wizardSignatureSpells',
];

function patchTouchesNormalizeSource(patch) {
  return !!patch && NORMALIZE_SOURCE_FIELDS.some(
    (field) => Object.prototype.hasOwnProperty.call(patch, field),
  );
}

function pruneOrphanFeatChoices(choices = {}) {
  if (!choices || typeof choices !== 'object') return choices;
  const ownerKeys = Object.keys(choices)
    .filter((key) => isFeatKey(key) && !isFeatDetailKey(key) && choices[key] != null && choices[key] !== '');
  const next = { ...choices };
  let mutated = false;
  Object.keys(next).forEach((key) => {
    if (!isFeatDetailKey(key)) return;
    const hasOwner = ownerKeys.some((owner) => key === owner || key.startsWith(`${owner}_`));
    if (!hasOwner) {
      delete next[key];
      mutated = true;
    }
  });
  return mutated ? next : choices;
}

function hasLevelAbove(key, classLevel) {
  const k = String(key || '');
  // Generic: feat_asi_lv{N}, bard_expertise_lv{N}, etc.
  var match = k.match(/lv(\d+)/i);
  if (match) return Number(match[1]) > Number(classLevel);
  // Adapter-registered patterns: invocations, mystic arcanum, etc.
  var choiceLv = getChoiceLevel(k);
  return choiceLv != null && Number(classLevel) < choiceLv;
}

function cleanChoicesForLevel(choices, classLevel) {
  const out = {};
  Object.keys(choices || {}).forEach(function(key) {
    if (!hasLevelAbove(key, classLevel)) out[key] = choices[key];
  });
  return out;
}

// Sum of levels from selected (named) multiclass slots. A blank slot — just added
// but not yet assigned a class — contributes nothing until a class is chosen.
function extraClassLevels(extraClasses) {
  return (extraClasses || [])
    .filter((ec) => ec && ec.name)
    .reduce((sum, ec) => sum + (Number(ec.level) || 1), 0);
}

// Total character level = primary class level + selected multiclass levels.
// Single source of truth for the stats level; XP is tracked separately (xp/set).
function totalCharacterLevel(classLevel, extraClasses) {
  return (Number(classLevel) || 1) + extraClassLevels(extraClasses);
}

export function normalizeCharacterLevels(character = {}) {
  const classLevel = getPrimaryClassLevel(character);
  return {
    ...character,
    classLevel,
    level: totalCharacterLevel(classLevel, character.extraClasses),
  };
}

function normChoice(value) {
  return String(value || '')
    .split('|')[0]
    .replace(/\{@[a-z]+ ([^|}]+)(?:\|[^}]*)?\}/gi, '$1')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const initialCharacter = {
  name: '',
  xp: 0,
  activeClassTab: 0,
  className: '',
  classSource: '',
  classLevel: 1,
  cls: null,
  allFeatures: [],
  subclasses: [],
  allSubFeatures: [],
  level: 1,
  subclassShortName: '',
  subclassSource: '',
  extraClasses: [],
  speciesName: '',
  speciesSource: '',
  speciesObj: null,
  backgroundName: '',
  backgroundSource: '',
  backgroundObj: null,
  backgroundAbilities: [],
  backgroundPattern: [],
  backgroundPatternIdx: 0,
  scoreMethod: 'pointbuy',
  hpMode: 'average',
  hpManualRolls: {},
  pbScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  arrAssign: Object.fromEntries(STATS.map((stat, index) => [stat, STANDARD_ARRAY[index] ?? null])),
  dicePool: [],
  diceAssign: Object.fromEntries(STATS.map((stat) => [stat, null])),
  manualScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  selDiceIdx: null,
  selectedCantrips: [],
  selectedSpells: {},
  wizardSpellbook: {},
  wizardSpellMastery: {},
  wizardSignatureSpells: {},
  choices: {},
  equipChoices: {},
  selectedSkills: [],
  selectedLanguages: [],
  selectedTools: [],
  currency: { cp: 0, sp: 0, gp: 0, pp: 0, custom: [] },
  inventory: [],
};

export const initialBuilderState = {
  tab: 0,
  character: initialCharacter,
  loading: {
    classes: true,
    species: true,
    backgrounds: true,
    feats: true,
    spells: true,
    items: true,
    optionalFeatures: true,
  },
  errors: {},
  data: {
    classCache: {},
    classes: CLASS_SUMMARIES,
    subclasses: [],
    classFeatures: [],
    subclassFeatures: [],
    species: SPECIES_SUMMARIES,
    backgrounds: BACKGROUND_SUMMARIES,
    feats: FEAT_SUMMARIES,
    spells: [],
    classSpellIndex: {},
    items: ITEM_SUMMARIES,
    optionalFeatures: [],
    beasts: [],
  },
  search: {
    classes: '',
    species: '',
    background: '',
    inventory: '',
    currentInventory: '',
    feats: '',
    spells: '',
  },
  // Equipment step list state. UI only — `saveCharacter` persists
  // `state.character`, so none of this reaches storage. It lives here rather
  // than in the step so it survives navigating away and back, the same way the
  // search boxes above already do.
  inventoryFilter: 'all',
  inventoryFilters: emptyItemFilters(),
  currentInventoryFilter: 'all',
  currentInventoryFilters: emptyItemFilters(),
  choiceDialog: null,
  adaptersLoaded: false,
  adaptersVersion: 0,
  loadedAdapterClasses: [],
  dataAdapted: false,
};

function updateCharacter(state, patch) {
  const merged = { ...state.character, ...patch };
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'choices')) {
    merged.choices = pruneOrphanFeatChoices(merged.choices);
  }
  if (patchTouchesNormalizeSource(patch)) {
    merged.normalizedChoices = normalizeCharacterChoices(merged);
  }
  return { ...state, character: merged };
}

function updateNestedCharacter(state, key, patch) {
  return {
    ...state,
    character: {
      ...state.character,
      [key]: {
        ...state.character[key],
        ...patch,
      },
    },
  };
}

function findByNameSource(list, name, source) {
  return list.find((item) => item.name === name && (!source || item.source === source)) || null;
}

// Remove a single unit of the item identified by `name|source` (decrement qty,
// drop the row when it hits zero). Used to swap equipment-type picker selections.
function removeOneByRef(inventory, ref) {
  const [name, source = ''] = String(ref || '').split('|');
  const list = inventory || [];
  const idx = list.findIndex((item) => item.name === name && (item.source || '') === source);
  if (idx === -1) return list;
  const next = [...list];
  const qty = Math.max(0, Number(next[idx].qty ?? 1) - 1);
  if (qty > 0) next[idx] = { ...next[idx], qty };
  else next.splice(idx, 1);
  return next;
}

function isSpeciesChoiceKey(key) {
  const k = String(key || '');
  return (
    k.startsWith('species_') ||
    k === 'khoravar_skill_versatility'
  );
}

function clearSpeciesChoices(choices = {}) {
  const next = { ...choices };
  Object.keys(next).forEach((key) => {
    if (isSpeciesChoiceKey(key)) delete next[key];
  });
  return next;
}

function pruneStaleSpeciesLineageChoices(choices = {}, versionValue) {
  const stored = String(Array.isArray(versionValue) ? versionValue[0] : versionValue || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const next = { ...choices };
  Object.keys(next).forEach((key) => {
    const m = key.match(/^species_(.+?)_(cantrip|spell)(?:_|$)/);
    if (!m) return;
    if (key === 'species_spell_ability') return;
    const keyLineage = m[1].replace(/_/g, '').toLowerCase();
    if (!stored || keyLineage !== stored) delete next[key];
  });
  return next;
}

function clearChoicePrefix(choices = {}, prefix) {
  const target = String(prefix || '');
  if (!target) return { ...choices };
  const next = { ...choices };
  Object.keys(next).forEach((key) => {
    if (String(key).startsWith(target)) delete next[key];
  });
  return next;
}

export function builderReducer(state, action) {
  switch (action.type) {
    case 'data/load-start':
      return { ...state, loading: { ...state.loading, [action.scope]: true }, errors: { ...state.errors, [action.scope]: '' } };
    case 'data/load-error':
      return { ...state, loading: { ...state.loading, [action.scope]: false }, errors: { ...state.errors, [action.scope]: action.error } };
    case 'data/load-success':
      return {
        ...state,
        loading: { ...state.loading, [action.scope]: false },
        data: { ...state.data, ...action.payload },
        dataAdapted: false,
      };
    case 'adapters/loaded':
      return { ...state, adaptersLoaded: true, dataAdapted: false };
    case 'adapters/version-bump':
      return { ...state, adaptersVersion: (state.adaptersVersion || 0) + 1 };
    case 'adapters/loaded-for-classes': {
      const incoming = Array.isArray(action.classes) ? action.classes : [];
      if (!incoming.length) return state;
      return {
        ...state,
        adaptersVersion: (state.adaptersVersion || 0) + 1,
        loadedAdapterClasses: [
          ...new Set([
            ...(state.loadedAdapterClasses || []),
            ...incoming,
          ]),
        ],
      };
    }
    case 'data/adapt': {
      const data = action.payload || state.data;
      // Derive the class-scoped data (subclasses + feature lists) for one class.
      // Shared by the primary class and every multiclass entry so re-hydration
      // after a reload (when heavy fields were stripped) is identical for both.
      const deriveClassData = (name, source, subclassSource = '') => ({
        subclasses: data.subclasses.filter((s) => s.className === name && (s.classSource === source || !s.classSource)),
        allFeatures: data.classFeatures.filter((f) => f.className === name && (f.classSource === source || !f.classSource)),
        allSubFeatures: data.subclassFeatures.filter((f) => f.className === name && (f.classSource === source || !f.classSource) && (!subclassSource || !f._copy || f.subclassSource === subclassSource)),
      });

      const classObject = findByNameSource(data.classes, state.character.className, state.character.classSource) || state.character.cls;
      const speciesObj = findByNameSource(data.species, state.character.speciesName, state.character.speciesSource) || state.character.speciesObj;
      const backgroundObj = findByNameSource(data.backgrounds, state.character.backgroundName, state.character.backgroundSource) || state.character.backgroundObj;
      const className = classObject?.name || state.character.className;
      const classSource = classObject?.source || state.character.classSource;

      const extraClasses = (state.character.extraClasses || []).map((extra) => {
        const extraCls = findByNameSource(data.classes, extra.name, extra.source) || extra.cls;
        if (!extraCls) return extra;
        return { ...extra, cls: extraCls, ...deriveClassData(extraCls.name, extraCls.source, extra.subclassSource || '') };
      });

      return {
        ...state,
        data,
        dataAdapted: true,
        character: {
          ...state.character,
          cls: classObject,
          speciesObj,
          backgroundObj,
          extraClasses,
          ...deriveClassData(className, classSource, state.character.subclassSource || ''),
        },
      };
    }
    case 'tab/set':
      return { ...state, tab: action.tab };
    case 'field/set':
      return updateCharacter(state, { [action.field]: action.value });
    case 'class/level': {
      const extras = extraClassLevels(state.character.extraClasses);
      const classLevel = Math.min(Math.max(1, 20 - extras), Math.max(1, Number(action.level) || 1));
      const choices = cleanChoicesForLevel(state.character.choices || {}, classLevel);
      return updateCharacter(state, {
        classLevel,
        level: totalCharacterLevel(classLevel, state.character.extraClasses),
        choices,
      });
    }
    case 'xp/set': {
      // XP is an independent progress tracker — it does NOT drive the character
      // level used for stats. Stats level comes from the class panels (level +
      // classLevel + extraClasses). See XpPanel / LevelPanel.
      const xp = Math.max(0, Number(action.value) || 0);
      return updateCharacter(state, { xp });
    }
    case 'search/set':
      return { ...state, search: { ...state.search, [action.scope]: action.value } };
    case 'class-tab/set':
      return updateCharacter(state, { activeClassTab: action.tab });
    case 'multiclass/add': {
      if (Number(state.character.level || 1) >= 20) return state;
      if ((state.character.extraClasses || []).some((extraClass) => !extraClass?.name)) return state;
      const extraClasses = [
        ...state.character.extraClasses,
        {
          name: '',
          source: '',
          level: 1,
          cls: null,
          subclassShortName: '',
          subclasses: [],
          allFeatures: [],
          allSubFeatures: [],
        },
      ];
      const total = totalCharacterLevel(state.character.classLevel, extraClasses);
      return updateCharacter(state, {
        activeClassTab: extraClasses.length,
        extraClasses,
        level: total,
      });
    }
    case 'multiclass/remove': {
      const index = Number(action.index);
      if (!Number.isInteger(index) || index < 0) return state;
      const extraClasses = state.character.extraClasses.filter((_, itemIndex) => itemIndex !== index);
      const choices = { ...state.character.choices };
      const removedPrefix = `mc${index}_`;
      Object.keys(choices).forEach((key) => {
        if (key.startsWith(removedPrefix)) delete choices[key];
      });
      const remappedChoices = {};
      Object.entries(choices).forEach(([key, value]) => {
        const match = key.match(/^mc(\d+)_(.*)$/);
        if (match) {
          const oldIdx = Number(match[1]);
          if (oldIdx > index) remappedChoices[`mc${oldIdx - 1}_${match[2]}`] = value;
          else remappedChoices[key] = value;
        } else {
          remappedChoices[key] = value;
        }
      });
      const total = totalCharacterLevel(state.character.classLevel, extraClasses);
      return updateCharacter(state, { extraClasses, activeClassTab: 0, choices: remappedChoices, level: total });
    }
    case 'class/select': {
      return handleClassSelect(state, action, { findByNameSource, updateCharacter });
    }
    case 'subclass/select': {
      const choices = { ...state.character.choices };
      Object.keys(choices).forEach((key) => {
        if (key.startsWith('subclass_') || key.includes('_skill_') || key.includes('_exp_')) delete choices[key];
      });
      const selectedSubclass = (state.character.subclasses || []).find(
        (s) => s.shortName === action.subclassShortName
      );
      const subclassSource = selectedSubclass?.source || '';
      const allSubFeatures = state.data.subclassFeatures.filter(
        (feature) => feature.className === state.character.className
          && (feature.classSource === state.character.classSource || !feature.classSource)
          && (!subclassSource || !feature._copy || feature.subclassSource === subclassSource)
      );
      return updateCharacter(state, { subclassShortName: action.subclassShortName, subclassSource, allSubFeatures, choices });
    }
    case 'extra-class/select': {
      const idx = Number(action.index);
      if (!Number.isInteger(idx) || idx < 0) return state;
      const classObject = action.classObject || findByNameSource(state.data.classes, action.className, action.source);
      if (!classObject) return state;

      const previous = state.character.extraClasses?.[idx] || {};
      const sameClass = previous.name === classObject.name && (!action.source || previous.source === classObject.source);
      const subclasses = state.data.subclasses.filter((subclass) => subclass.className === classObject.name && (subclass.classSource === classObject.source || !subclass.classSource));
      const allFeatures = state.data.classFeatures.filter((feature) => feature.className === classObject.name && (feature.classSource === classObject.source || !feature.classSource));
      const allSubFeatures = state.data.subclassFeatures.filter((feature) => feature.className === classObject.name && (feature.classSource === classObject.source || !feature.classSource));

      const prefix = `mc${idx}_`;
      const choices = { ...state.character.choices };
      if (!sameClass) {
        Object.keys(choices).forEach((key) => {
          if (key.startsWith(prefix)) delete choices[key];
        });
      }

      const extraClasses = state.character.extraClasses.map((extraClass, itemIndex) => (
        itemIndex === idx
          ? {
              ...extraClass,
              name: classObject.name,
              source: classObject.source,
              cls: classObject,
              clsSnapshot: null,
              level: Math.max(1, Number(extraClass.level) || 1),
              subclassShortName: sameClass ? (extraClass.subclassShortName || '') : '',
              subclasses,
              allFeatures,
              allSubFeatures,
            }
          : extraClass
      ));
      const total = totalCharacterLevel(state.character.classLevel, extraClasses);
      if (!previous.name && total > 20) return state;
      return updateCharacter(state, { extraClasses, choices, activeClassTab: idx + 1, level: total });
    }
    case 'extra-subclass/select': {
      const idx = Number(action.index);
      if (!Number.isInteger(idx) || idx < 0) return state;
      const prefix = `mc${idx}_`;
      const choices = { ...state.character.choices };
      Object.keys(choices).forEach((key) => {
        if (key.startsWith(`${prefix}subclass_`) || (key.startsWith(prefix) && (key.includes('_skill_') || key.includes('_exp_')))) delete choices[key];
      });
      const extraClasses = state.character.extraClasses.map((extraClass, itemIndex) => {
        if (itemIndex !== idx) return extraClass;
        const selectedSubclass = (extraClass.subclasses || []).find(
          (s) => s.shortName === action.subclassShortName
        );
        const subclassSource = selectedSubclass?.source || '';
        const allSubFeatures = state.data.subclassFeatures.filter(
          (feature) => feature.className === extraClass.name
            && (feature.classSource === extraClass.source || !feature.classSource)
            && (!subclassSource || !feature._copy || feature.subclassSource === subclassSource)
        );
        return { ...extraClass, subclassShortName: action.subclassShortName, subclassSource, allSubFeatures };
      });
      return updateCharacter(state, { extraClasses, choices });
    }
    case 'extra-class/level': {
      const idx = Number(action.index);
      if (!Number.isInteger(idx) || idx < 0) return state;
      const primaryLevel = getPrimaryClassLevel(state.character);
      const otherExtraLevels = (state.character.extraClasses || [])
        .filter((extraClass, itemIndex) => itemIndex !== idx && extraClass?.name)
        .reduce((sum, extraClass) => sum + (Number(extraClass.level) || 1), 0);
      const maxLevel = Math.max(1, 20 - primaryLevel - otherExtraLevels);
      const newLevel = Math.min(maxLevel, Math.max(1, Number(action.level) || 1));
      const extraClasses = state.character.extraClasses.map((extraClass, itemIndex) => (
        itemIndex === idx ? { ...extraClass, level: newLevel } : extraClass
      ));
      const total = totalCharacterLevel(state.character.classLevel, extraClasses);
      const prefix = `mc${idx}_`;
      const choices = { ...(state.character.choices || {}) };
      Object.keys(choices).forEach(function(key) {
        if (!key.startsWith(prefix)) return;
        const withoutPrefix = key.slice(prefix.length);
        if (hasLevelAbove(withoutPrefix, newLevel)) delete choices[key];
      });
      return updateCharacter(state, { extraClasses, level: total, choices });
    }
    case 'species/select': {
      const speciesObj = action.speciesObj || findByNameSource(state.data.species, action.name, action.source);
      const sameSpecies = state.character.speciesName === action.name
        && (!action.source || state.character.speciesSource === action.source);

      return updateCharacter(state, {
        speciesName: action.name,
        speciesSource: action.source,
        speciesObj,
        choices: sameSpecies ? state.character.choices : clearSpeciesChoices(state.character.choices),
      });
    }
    case 'background/select': {
      return handleBackgroundSelect(state, action, { findByNameSource, updateCharacter });
    }
    case 'background/pattern': {
      const pattern = getBackgroundPattern(state.character.backgroundObj, action.index);
      return updateCharacter(state, { backgroundPatternIdx: action.index, backgroundPattern: pattern, backgroundAbilities: [] });
    }
    case 'background/ability-toggle': {
      const current = state.character.backgroundAbilities || [];
      const exists = current.includes(action.stat);
      const max = (state.character.backgroundPattern || [2, 1]).length;
      const backgroundAbilities = exists
        ? current.filter((stat) => stat !== action.stat)
        : [...(current.length >= max ? current.slice(1) : current), action.stat];
      return updateCharacter(state, { backgroundAbilities });
    }
    case 'score/method':
      return updateCharacter(state, { scoreMethod: action.method });
    case 'score/set':
      return updateNestedCharacter(state, action.bucket, { [action.stat]: action.value });
    case 'hp/mode':
      return updateCharacter(state, { hpMode: action.mode });
    case 'hp/roll':
      return updateNestedCharacter(state, 'hpManualRolls', { [action.key]: action.value });
    case 'dice/roll': {
      const dicePool = Array.from({ length: 6 }, () => {
        const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
        return rolls[0] + rolls[1] + rolls[2];
      });
      return updateCharacter(state, {
        dicePool,
        diceAssign: Object.fromEntries(STATS.map((stat) => [stat, null])),
        selDiceIdx: null,
      });
    }
    case 'dice/select':
      return updateCharacter(state, { selDiceIdx: state.character.selDiceIdx === action.index ? null : action.index });
    case 'dice/assign': {
      const idx = state.character.selDiceIdx;
      if (idx == null) return state;
      const value = state.character.dicePool[idx];
      return updateCharacter(state, {
        diceAssign: { ...state.character.diceAssign, [action.stat]: value },
        dicePool: state.character.dicePool.filter((_, itemIdx) => itemIdx !== idx),
        selDiceIdx: null,
      });
    }
    case 'dice/unassign': {
      const value = state.character.diceAssign[action.stat];
      if (value == null) return state;
      return updateCharacter(state, {
        diceAssign: { ...state.character.diceAssign, [action.stat]: null },
        dicePool: [...state.character.dicePool, value],
      });
    }
    case 'currency/set':
      return updateCharacter(state, { currency: setCoinAmount(state.character.currency, action.coin, action.value) });
    case 'currency/custom-add':
      return updateCharacter(state, { currency: addCustomCurrency(state.character.currency, action.entry) });
    case 'currency/custom-update':
      return updateCharacter(state, { currency: updateCustomCurrency(state.character.currency, action.id, action.patch) });
    case 'currency/custom-remove':
      return updateCharacter(state, { currency: removeCustomCurrency(state.character.currency, action.id) });
    case 'currency/reorder':
      return updateCharacter(state, { currency: reorderCurrency(state.character.currency, action.key, action.dir) });
    case 'inventory/filter':
      return { ...state, inventoryFilter: action.filter };
    case 'inventory/filters':
      return { ...state, inventoryFilters: action.filters };
    case 'inventory/current-filter':
      return { ...state, currentInventoryFilter: action.filter };
    case 'inventory/current-filters':
      return { ...state, currentInventoryFilters: action.filters };
    case 'inventory/add': {
      const inventory = addInventoryEntries(state.character.inventory, [action.item], state.data.items);
      return updateCharacter(state, { inventory });
    }
    case 'inventory/custom':
      return updateCharacter(state, { inventory: [...state.character.inventory, { ...action.item, custom: true, qty: 1 }] });
    case 'equipment/select':
      return updateNestedCharacter(state, 'equipChoices', { [action.key]: state.character.equipChoices[action.key] === action.value ? null : action.value });
    case 'equipment/select-type-item': {
      const { key, item } = action;
      const prevRef = action.prevRef || null;
      const newRef = item ? `${item.name}|${item.source}` : null;
      const toggleOff = prevRef && newRef === prevRef;
      let inventory = prevRef ? removeOneByRef(state.character.inventory, prevRef) : state.character.inventory;
      if (!toggleOff && item) {
        inventory = addInventoryEntries(inventory, [{ ...item, qty: item.qty ?? 1 }], state.data.items);
      }
      const equipChoices = { ...state.character.equipChoices, [key]: toggleOff ? null : newRef };
      return updateCharacter(state, { inventory, equipChoices });
    }
    case 'equipment/add-extracted': {
      const currency = { ...state.character.currency };
      Object.entries(action.currency || {}).forEach(([coin, value]) => {
        currency[coin] = normalizeCoinAmount(currency[coin]) + normalizeCoinAmount(value);
      });
      const inventory = addInventoryEntries(
        state.character.inventory,
        action.items || [],
        state.data.items,
      );
      return updateCharacter(state, { currency, inventory });
    }
    case 'inventory/qty': {
      const inventory = state.character.inventory.flatMap((item, idx) => {
        if (idx !== action.index) return [item];
        const qty = Math.max(0, Number(item.qty ?? 1) + action.delta);
        return qty > 0 ? [{ ...item, qty }] : [];
      });
      return updateCharacter(state, { inventory });
    }
    case 'inventory/remove':
      return updateCharacter(state, {
        inventory: state.character.inventory.filter((_, idx) => idx !== action.index),
      });
    case 'spell/toggle': {
      return handleSpellToggle(state, action, { updateCharacter });
    }
    case 'wizard/spellbook-toggle': {
      return handleWizardSpellbookToggle(state, action, { updateCharacter });
    }
    case 'choice/set': {
      const merged = action.clearPrefix
        ? clearChoicePrefix(state.character.choices || {}, action.clearPrefix)
        : { ...(state.character.choices || {}) };
      merged[action.key] = action.value;
      const next = action.key === 'species_version'
        ? pruneStaleSpeciesLineageChoices(merged, action.value)
        : merged;
      return updateCharacter(state, { choices: next });
    }
    case 'choice/set-entry': {
      const base = clearChoicePrefix(state.character.choices || {}, action.clearPrefix);
      base[action.key] = action.value;
      return updateCharacter(state, { choices: base });
    }
    case 'choice/toggle-item': {
      const current = Array.isArray(state.character.choices[action.key]) ? state.character.choices[action.key] : [];
      const exists = current.includes(action.value);
      if (!exists && Array.isArray(action.blockedValues) && action.blockedValues.includes(normChoice(action.value))) return state;
      const max = action.max || 1;
      const next = exists
        ? current.filter((item) => item !== action.value)
        : [...(current.length >= max ? current.slice(1) : current), action.value];
      const mergedChoices = { ...(state.character.choices || {}), [action.key]: next };
      const finalChoices = action.key === 'species_version'
        ? pruneStaleSpeciesLineageChoices(mergedChoices, next)
        : mergedChoices;
      return updateCharacter(state, { choices: finalChoices });
    }
    case 'character/restore': {
      const restored = { ...initialCharacter, ...normalizeCharacterLevels(action.character) };
      restored.normalizedChoices = normalizeCharacterChoices(restored);
      // Force a re-adapt so cls/speciesObj/extraClasses are re-derived from the
      // restored snapshots. Matters when restoring AFTER data already adapted
      // (e.g. importing a JSON at runtime, not just the initial cloud hydration).
      return { ...state, character: restored, dataAdapted: false };
    }
    case 'choice/open':
      return { ...state, choiceDialog: { title: action.title, body: action.body } };
    case 'choice/close':
      return { ...state, choiceDialog: null };
    default:
      return state;
  }
}

export function getActiveScores(character) {
  if (character.scoreMethod === 'manual') return character.manualScores;
  if (character.scoreMethod === 'standard') return character.arrAssign;
  if (character.scoreMethod === 'dice') return character.diceAssign;
  return character.pbScores;
}
