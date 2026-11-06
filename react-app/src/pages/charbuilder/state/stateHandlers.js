import { getBackgroundPattern } from '../progression/calculations.js';
import { findSpellListEntryIndexByClass } from '../../../shared/character/spells/featSpellLists.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import {
  bucketCounts, hasPickedSpell, withoutSpellPicked, withSpellPicked, withWizardBookToggled,
} from '../../../shared/character/spells/spellBuckets.js';

// The class entry a spell action edits: an extra class by index, else the
// character (the primary class).
function updateSpellBucket(state, extraIndex, patchFor, updateCharacter) {
  if (Number.isInteger(extraIndex) && extraIndex >= 0) {
    const extraClasses = state.character.extraClasses.map((extraClass, itemIndex) => (
      itemIndex === extraIndex ? { ...extraClass, ...patchFor(extraClass) } : extraClass
    ));
    return updateCharacter(state, { extraClasses });
  }
  return updateCharacter(state, patchFor(state.character));
}

export function handleClassSelect(state, action, { findByNameSource, updateCharacter }) {
  const classObject = action.classObject || findByNameSource(state.data.classes, action.className, action.source);
  const className = action.className || classObject?.name;
  const source = action.source || classObject?.source;
  const subclasses = state.data.subclasses.filter((subclass) => subclass.className === className && (subclass.classSource === source || !subclass.classSource));
  const allFeatures = state.data.classFeatures.filter((feature) => feature.className === className && (feature.classSource === source || !feature.classSource));
  const allSubFeatures = state.data.subclassFeatures.filter((feature) => feature.className === className && (feature.classSource === source || !feature.classSource));
  if (state.character.activeClassTab > 0) {
    const index = state.character.activeClassTab - 1;
    const currentExtra = state.character.extraClasses[index];
    const sameExtraClass = currentExtra?.name === className && (!source || currentExtra?.source === source);
    const extraClasses = state.character.extraClasses.map((extraClass, itemIndex) => (
      itemIndex === index
        ? { ...extraClass, name: className, source, cls: classObject, clsSnapshot: classObject ? null : extraClass.clsSnapshot, subclassShortName: '', subclasses, allFeatures, allSubFeatures }
        : extraClass
    ));
    if (sameExtraClass) {
      return updateCharacter(state, {
        extraClasses: state.character.extraClasses.map((extraClass, itemIndex) => (
          itemIndex === index ? { ...extraClass, name: className, source, cls: classObject, clsSnapshot: classObject ? null : extraClass.clsSnapshot, subclasses, allFeatures, allSubFeatures } : extraClass
        )),
      });
    }
    const choices = { ...state.character.choices };
    const prefix = `mc${index}_`;
    Object.keys(choices).forEach((key) => { if (key.startsWith(prefix)) delete choices[key]; });
    return updateCharacter(state, { extraClasses, choices });
  }
  const sameClass = state.character.className === className && (!source || state.character.classSource === source);
  if (sameClass) {
    return updateCharacter(state, {
      className,
      classSource: source,
      cls: classObject,
      clsSnapshot: classObject ? null : state.character.clsSnapshot,
      subclasses,
      allFeatures,
      allSubFeatures,
    });
  }
  return updateCharacter(state, {
    className,
    classSource: source,
    cls: classObject,
    clsSnapshot: null,
    subclassShortName: '',
    subclasses,
    allFeatures,
    allSubFeatures,
    selectedCantrips: [],
    selectedSpells: {},
    wizardSpellbook: {},
    wizardSpellMastery: {},
    wizardSignatureSpells: {},
    choices: {},
  });
}

export function handleBackgroundSelect(state, action, { findByNameSource, updateCharacter }) {
  const backgroundObj = action.backgroundObj || findByNameSource(state.data.backgrounds, action.name, action.source);
  const pattern = getBackgroundPattern(backgroundObj, 0);
  const sameBackground = state.character.backgroundName === action.name && (!action.source || state.character.backgroundSource === action.source);
  if (sameBackground) {
    return updateCharacter(state, {
      backgroundName: action.name,
      backgroundSource: action.source,
      backgroundObj,
      backgroundPattern: state.character.backgroundPattern?.length ? state.character.backgroundPattern : pattern,
    });
  }
  const choices = { ...state.character.choices };
  Object.keys(choices).forEach((key) => { if (key.startsWith('bg_') || key === 'feat_origin' || key.startsWith('feat_origin_')) delete choices[key]; });
  if (action.feat) {
    choices.feat_origin = action.feat;
    if (action.classHint) {
      const featObj = state.data.feats.find((feat) => matchKey(feat.name) === matchKey(action.feat));
      const idx = findSpellListEntryIndexByClass(featObj?.additionalSpells, action.classHint);
      if (idx >= 0) choices.feat_origin_entry = idx;
    }
  }
  return updateCharacter(state, {
    backgroundName: action.name,
    backgroundSource: action.source,
    backgroundObj,
    backgroundPattern: pattern,
    backgroundPatternIdx: 0,
    backgroundAbilities: [],
    choices,
  });
}

export function handleSpellToggle(state, action, { updateCharacter }) {
  const level = Number(action.level || 0);
  const name = String(action.name || '');
  const max = Number(action.max || 0);
  if (!name) return state;
  return updateSpellBucket(state, action.extraIndex, (bucket) => {
    if (hasPickedSpell(bucket, level, name)) return withoutSpellPicked(bucket, level, name);
    const counts = bucketCounts(bucket);
    if (max > 0 && (level === 0 ? counts.cantrips : counts.spells) >= max) return {};
    return withSpellPicked(bucket, level, name);
  }, updateCharacter);
}

export function handleWizardSpellbookToggle(state, action, { updateCharacter }) {
  const level = Math.max(0, Math.min(9, Number(action.level || 0)));
  const name = String(action.name || '');
  if (!name) return state;
  return updateSpellBucket(state, action.extraIndex, (bucket) => withWizardBookToggled(bucket, level, name), updateCharacter);
}
