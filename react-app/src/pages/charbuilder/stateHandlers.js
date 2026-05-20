import { getBackgroundPattern } from './logic/calculations.js';

function normKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normSpellName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeWizardSpellbook(book) {
  const next = {};
  for (let level = 0; level <= 9; level++) {
    const seen = new Set();
    next[level] = [];
    (book?.[level] || []).forEach((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.name;
      const key = normSpellName(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      next[level].push(name);
    });
  }
  return next;
}

function removeSelectedSpellAtLevel(bucket, level, name) {
  const normalized = normSpellName(name);
  if (level === 0) {
    return {
      selectedCantrips: (bucket?.selectedCantrips || []).filter((entry) => normSpellName(entry) !== normalized),
    };
  }
  const selectedSpells = Object.fromEntries(
    Object.entries(bucket?.selectedSpells || {}).map(([spellLevel, list]) => [spellLevel, Array.isArray(list) ? [...list] : []]),
  );
  const key = String(level);
  selectedSpells[key] = (selectedSpells[key] || []).filter((entry) => normSpellName(entry) !== normalized);
  if (!selectedSpells[key].length) delete selectedSpells[key];
  return { selectedSpells };
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
      const featObj = state.data.feats.find((feat) => normKey(feat.name) === normKey(action.feat));
      const additional = Array.isArray(featObj?.additionalSpells) ? featObj.additionalSpells : [];
      if (additional.length > 1) {
        const hint = action.classHint;
        const idx = additional.findIndex((entry) => {
          const sources = [];
          ['known', 'innate', 'prepared', 'expanded'].forEach((mode) => {
            const section = entry?.[mode];
            if (!section) return;
            Object.values(section).forEach((items) => {
              if (!Array.isArray(items)) return;
              items.forEach((spell) => {
                if (typeof spell === 'string') sources.push(spell.split('|')[0]);
              });
            });
          });
          if (entry?.name) sources.push(entry.name);
          return sources.some((source) => String(source).toLowerCase().includes(hint));
        });
        if (idx >= 0) choices.feat_origin_entry = idx;
      }
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
  const extraIndex = action.extraIndex;
  if (Number.isInteger(extraIndex) && extraIndex >= 0) {
    const extraClasses = state.character.extraClasses.map((extraClass, itemIndex) => {
      if (itemIndex !== extraIndex) return extraClass;
      if (level === 0) {
        const current = extraClass.selectedCantrips || [];
        const has = current.includes(name);
        if (!has && max > 0 && current.length >= max) return extraClass;
        return { ...extraClass, selectedCantrips: has ? current.filter((spell) => spell !== name) : [...current, name] };
      }
      const currentByLevel = extraClass.selectedSpells || {};
      const current = Array.isArray(currentByLevel[level]) ? currentByLevel[level] : [];
      const has = current.includes(name);
      const total = Object.values(currentByLevel).reduce((sum, spells) => sum + (Array.isArray(spells) ? spells.length : 0), 0);
      if (!has && max > 0 && total >= max) return extraClass;
      const nextLevel = has ? current.filter((spell) => spell !== name) : [...current, name];
      const selectedSpells = { ...currentByLevel, [level]: nextLevel };
      if (!nextLevel.length) delete selectedSpells[level];
      return { ...extraClass, selectedSpells };
    });
    return updateCharacter(state, { extraClasses });
  }
  if (level === 0) {
    const current = state.character.selectedCantrips || [];
    const has = current.includes(name);
    if (!has && max > 0 && current.length >= max) return state;
    return updateCharacter(state, { selectedCantrips: has ? current.filter((spell) => spell !== name) : [...current, name] });
  }
  const currentByLevel = state.character.selectedSpells || {};
  const current = Array.isArray(currentByLevel[level]) ? currentByLevel[level] : [];
  const has = current.includes(name);
  const total = Object.values(currentByLevel).reduce((sum, spells) => sum + (Array.isArray(spells) ? spells.length : 0), 0);
  if (!has && max > 0 && total >= max) return state;
  const nextLevel = has ? current.filter((spell) => spell !== name) : [...current, name];
  const selectedSpells = { ...currentByLevel, [level]: nextLevel };
  if (!nextLevel.length) delete selectedSpells[level];
  return updateCharacter(state, { selectedSpells });
}

export function handleWizardSpellbookToggle(state, action, { updateCharacter }) {
  const level = Math.max(0, Math.min(9, Number(action.level || 0)));
  const name = String(action.name || '');
  if (!name) return state;
  const normalized = normSpellName(name);
  const extraIndex = action.extraIndex;

  if (Number.isInteger(extraIndex) && extraIndex >= 0) {
    const extraClasses = state.character.extraClasses.map((extraClass, itemIndex) => {
      if (itemIndex !== extraIndex) return extraClass;
      const wizardSpellbook = normalizeWizardSpellbook(extraClass.wizardSpellbook);
      const current = wizardSpellbook[level] || [];
      const has = current.some((entry) => normSpellName(entry) === normalized);
      wizardSpellbook[level] = has
        ? current.filter((entry) => normSpellName(entry) !== normalized)
        : [...current, name];

      const nextExtra = { ...extraClass, wizardSpellbook };
      return has ? { ...nextExtra, ...removeSelectedSpellAtLevel(nextExtra, level, name) } : nextExtra;
    });
    return updateCharacter(state, { extraClasses });
  }

  const wizardSpellbook = normalizeWizardSpellbook(state.character.wizardSpellbook);
  const current = wizardSpellbook[level] || [];
  const has = current.some((entry) => normSpellName(entry) === normalized);
  wizardSpellbook[level] = has
    ? current.filter((entry) => normSpellName(entry) !== normalized)
    : [...current, name];

  return updateCharacter(state, has
    ? { wizardSpellbook, ...removeSelectedSpellAtLevel(state.character, level, name) }
    : { wizardSpellbook });
}
