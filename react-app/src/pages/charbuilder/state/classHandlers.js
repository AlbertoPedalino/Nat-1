import { multiclassLevels, primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { hasLevelAbove, totalCharacterLevel } from './choiceCleanup.js';

// The builder reducer's class actions beyond the primary class pick
// (stateHandlers.js handleClassSelect): subclasses and the multiclass tabs.
// `updateCharacter` and `findByNameSource` come from the reducer.

// A new, still empty, extra class tab (at most 20 levels in all, one empty tab
// at a time).
export function handleMulticlassAdd(state, action, { findByNameSource, updateCharacter }) {
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

// Drops an extra class with its mcN_ choices; the later classes' choice
// prefixes shift down by one.
export function handleMulticlassRemove(state, action, { findByNameSource, updateCharacter }) {
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

// The primary class's subclass: its features, and a clean slate for the
// subclass, skill and expertise choices.
export function handleSubclassSelect(state, action, { findByNameSource, updateCharacter }) {
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

// The class picked for an extra class tab; a different class than before
// drops that tab's choices.
export function handleExtraClassSelect(state, action, { findByNameSource, updateCharacter }) {
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

// An extra class's subclass, clearing that tab's subclass, skill and
// expertise choices.
export function handleExtraSubclassSelect(state, action, { findByNameSource, updateCharacter }) {
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

// An extra class's level (within the 20 left by the other classes); choices
// above the new level are dropped.
export function handleExtraClassLevel(state, action, { findByNameSource, updateCharacter }) {
  const idx = Number(action.index);
  if (!Number.isInteger(idx) || idx < 0) return state;
  const primaryLevel = primaryClassLevel(state.character);
  const otherExtraLevels = multiclassLevels(state.character.extraClasses, { except: idx });
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
