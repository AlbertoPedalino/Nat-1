import { getBackgroundPattern } from '../progression/calculations.js';
import {
  handleBackgroundSelect, handleClassSelect, handleSpellToggle, handleWizardSpellbookToggle,
} from './stateHandlers.js';
import { rollPool } from '../../../shared/character/dice/dice.js';
import {
  normalizeCoinAmount,
  setCoinAmount,
  addCustomCurrency,
  updateCustomCurrency,
  removeCustomCurrency,
  reorderCurrency,
} from '../../../shared/character/inventory/currency.js';
import { addInventoryEntries, stepInventoryQty } from '../../../shared/character/inventory/itemContainers.js';
import { normalizeCharacterChoices } from '../../../shared/character/progression/choiceNormalization.js';
import { withOwnedFeatSnapshots } from '../../../shared/character/progression/selectedFeats.js';
import { splitNameSource } from '../../../shared/content/nameKeys.js';
import { ABILITIES } from '../../../shared/content/rulesVocabulary.js';
import { multiclassLevels } from '../../../shared/character/progression/classLevel.js';
import { classScopedData } from '../../../shared/content/catalogs/classScope.js';
import {
  patchTouchesNormalizeSource, pruneOrphanFeatChoices, cleanChoicesForLevel, totalCharacterLevel,
  normalizeCharacterLevels, normChoice, clearSpeciesChoices, pruneStaleSpeciesLineageChoices,
  clearChoicePrefix,
} from './choiceCleanup.js';
import { initialCharacter } from './initialState.js';
import {
  handleExtraClassLevel, handleExtraClassSelect, handleExtraSubclassSelect, handleMulticlassAdd,
  handleMulticlassRemove, handleSubclassSelect,
} from './classHandlers.js';
import { DEFAULT_BACKGROUND_PATTERN } from '../../../shared/character/progression/abilityScores.js';

function updateCharacter(state, patch) {
  const merged = { ...state.character, ...patch };
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'choices')) {
    merged.choices = pruneOrphanFeatChoices(merged.choices);
  }
  if (patchTouchesNormalizeSource(patch)) {
    merged.normalizedChoices = normalizeCharacterChoices(merged);
  }
  return { ...state, character: withOwnedFeatSnapshots(merged, state.data.feats) };
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

// One fewer of the item a type picker had added (`name|source`), when the
// pick changes.
function removeOneByRef(inventory, ref) {
  const { name, source } = splitNameSource(ref);
  const index = (inventory || []).findIndex((item) => item.name === name && (item.source || '') === source);
  return index === -1 ? inventory || [] : stepInventoryQty(inventory, index, -1);
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
      const deriveClassData = (cls) => classScopedData(data, cls);

      const classObject = findByNameSource(data.classes, state.character.className, state.character.classSource) || state.character.cls;
      const speciesObj = findByNameSource(data.species, state.character.speciesName, state.character.speciesSource) || state.character.speciesObj;
      const backgroundObj = findByNameSource(data.backgrounds, state.character.backgroundName, state.character.backgroundSource) || state.character.backgroundObj;
      const className = classObject?.name || state.character.className;
      const classSource = classObject?.source || state.character.classSource;

      const extraClasses = (state.character.extraClasses || []).map((extra) => {
        const extraCls = findByNameSource(data.classes, extra.name, extra.source) || extra.cls;
        if (!extraCls) return extra;
        return { ...extra, cls: extraCls, ...deriveClassData(extraCls) };
      });

      return {
        ...state,
        data,
        dataAdapted: true,
        character: withOwnedFeatSnapshots({
          ...state.character,
          cls: classObject,
          speciesObj,
          backgroundObj,
          extraClasses,
          ...deriveClassData(classObject || { name: className, source: classSource }),
        }, data.feats),
      };
    }
    case 'tab/set':
      return { ...state, tab: action.tab };
    case 'field/set':
      return updateCharacter(state, { [action.field]: action.value });
    case 'class/level': {
      const extras = multiclassLevels(state.character.extraClasses);
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
    case 'multiclass/add':
      return handleMulticlassAdd(state, action, { findByNameSource, updateCharacter });
    case 'multiclass/remove':
      return handleMulticlassRemove(state, action, { findByNameSource, updateCharacter });
    case 'class/select': {
      return handleClassSelect(state, action, { findByNameSource, updateCharacter });
    }
    case 'subclass/select':
      return handleSubclassSelect(state, action, { findByNameSource, updateCharacter });
    case 'extra-class/select':
      return handleExtraClassSelect(state, action, { findByNameSource, updateCharacter });
    case 'extra-subclass/select':
      return handleExtraSubclassSelect(state, action, { findByNameSource, updateCharacter });
    case 'extra-class/level':
      return handleExtraClassLevel(state, action, { findByNameSource, updateCharacter });
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
      const max = (state.character.backgroundPattern || DEFAULT_BACKGROUND_PATTERN).length;
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
        const rolls = rollPool(4, 6).sort((a, b) => b - a);
        return rolls[0] + rolls[1] + rolls[2];
      });
      return updateCharacter(state, {
        dicePool,
        diceAssign: Object.fromEntries(ABILITIES.map((stat) => [stat, null])),
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
    case 'inventory/qty':
      return updateCharacter(state, { inventory: stepInventoryQty(state.character.inventory, action.index, action.delta) });
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
      // A capped list ignores a pick past its maximum; otherwise the oldest
      // pick makes room for the new one.
      if (!exists && action.capped && current.length >= max) return state;
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
    default:
      return state;
  }
}

