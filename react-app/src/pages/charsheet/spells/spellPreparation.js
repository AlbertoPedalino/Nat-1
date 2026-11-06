import { adapterRegistry } from '../../../adapters/registry.js';
import { lowerKey } from '../../../shared/content/nameKeys.js';

// How a spell row is held: its origin, its preparation state (prepared, known,
// always prepared, granted, at will, ritual book, Mystic Arcanum, item, cantrip)
// and whether casting it spends a slot.

const PREP_MODE_CACHE = new Map();
function getPrepMode(className) {
  if (!className) return null;
  const key = lowerKey(className);
  let mode = PREP_MODE_CACHE.get(key);
  if (mode === undefined) {
    try {
      const cfg = adapterRegistry.getClassRuntimeConfig(className)?.spellcasting;
      mode = cfg?.preparedMode || 'prepared';
    } catch { mode = 'prepared'; }
    PREP_MODE_CACHE.set(key, mode);
  }
  return mode;
}

export function resolveSpellMeta(entry, C) {
  const ownerClass = entry.ownerClassName || C?.className;
  const mode = ownerClass ? getPrepMode(ownerClass) : null;
  const kind = entry.sourceInfo?.kind;
  const label = entry.sourceInfo?.label;
  const src = entry.sourceInfo || {};
  const isLockedExtra = entry.locked && entry.sourceInfo;

  // Detect originType from sourceInfo if available, else infer
  let originType = src.originType || null;
  let originLabel = src.originLabel || label || null;
  if (!originType) {
    if (kind === 'atWill') { originType = 'invocation'; originLabel = label || 'At Will'; }
    else if (kind === 'ritualBook') { originType = 'spellbook'; originLabel = 'Ritual Book'; }
    else if (!entry.sourceInfo) { originType = 'class'; originLabel = ownerClass || 'Class'; }
    else if (C?.extraClasses?.some((ec) => ec.name === label)) { originType = 'class'; originLabel = label; }
    else if (label === 'Pact of the Tome') { originType = 'invocation'; originLabel = label; }
    else { originType = 'unknown'; }
  }

  let preparationState;
  let isPrepared = false, isKnown = false, isAlwaysPrepared = false, isGranted = false;
  let isAtWill = false, isFreeCast = false, isMysticArcanum = false, isSpellbook = false;
  let consumesSlot = true, isRitualFromSpellbook = false;

  if (kind === 'ritualBook') {
    isSpellbook = true;
    isRitualFromSpellbook = true;
    consumesSlot = false;
    preparationState = 'ritual_spellbook';
  } else if (kind === 'atWill') {
    isAtWill = true;
    consumesSlot = false;
    preparationState = 'at_will';
  } else if (originType === 'mystic_arcanum') {
    isMysticArcanum = true;
    isFreeCast = true;
    consumesSlot = false;
    preparationState = 'mystic_arcanum';
  } else if (originType === 'item') {
    isGranted = true;
    consumesSlot = false;
    preparationState = 'item_cast';
  } else if (entry.level === 0) {
    consumesSlot = false;
    preparationState = 'cantrip';
  } else if (originType === 'feat' || originType === 'species') {
    isGranted = true;
    preparationState = 'granted';
  } else if (isLockedExtra && mode === 'prepared') {
    isAlwaysPrepared = true;
    isGranted = true;
    preparationState = 'always_prepared';
  } else if (isLockedExtra && mode === 'known') {
    isGranted = true;
    preparationState = 'granted';
  } else if (isLockedExtra && !mode) {
    isGranted = true;
    preparationState = 'granted';
  } else if (mode === 'prepared') {
    isPrepared = true;
    preparationState = 'prepared';
  } else if (mode === 'known') {
    isKnown = true;
    preparationState = 'known';
  } else {
    isKnown = true;
    preparationState = 'known';
  }

  return {
    originType, originLabel, preparationState,
    isPrepared, isKnown, isAlwaysPrepared, isGranted,
    isAtWill, isFreeCast, isMysticArcanum, isSpellbook,
    isRitualFromSpellbook, consumesSlot,
  };
}
