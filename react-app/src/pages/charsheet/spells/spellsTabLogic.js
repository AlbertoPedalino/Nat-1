import { getPactMagicInfo, getSpellCastMode } from '../../../shared/character/spells/pactMagic.js';
import { mergeFreeCastsById, normalizeFreeCast } from '../../../shared/character/spells/spellFreeCasts.js';
import { collectItemAttachedSpells } from '../../../shared/character/inventory/itemAttachedSpells.js';
import { collectScrollSpells, scrollRowKey } from '../../../shared/character/inventory/spellScrolls.js';
import { lowerKey } from '../../../shared/content/nameKeys.js';
import {
  SRC_COLOR,
  isGenericSpellSourceLabel,
  mergeSpellSourceDisplay,
  unionSpellSources,
} from './spellSourceDisplay.js';
import { collectAtWillSpells, collectAutoGrantedSpells, collectChoiceSpells } from './grantedSpells.js';
import { collectFixedFeatSpells } from './featSpellMeta.js';
import { resolveSpellMeta } from './spellPreparation.js';
import { wizardRitualBookSpells } from './wizardSpellbook.js';
import { compareText } from '../../../shared/lists.js';

// The Spells tab's list: every spell the character has, from each source
// (class, subclass, species, feats, items, scrolls, at-will grants), merged into
// one row per spell with its sources, preparation status and free casts.
// Sources: grantedSpells.js, featSpellMeta.js, wizardSpellbook.js. Preparation:
// spellPreparation.js. Ability: spellAbility.js. Free casts for rests:
// spellFreeCastDefs.js. Slots and limits: spellcasting.js. Dice: spellDice.js.
// Riders and modifiers: spellModifiers.js.

const SPECIAL_ORIGIN = new Set(['at_will', 'invocation', 'mystic_arcanum', 'spellbook']);

function mergeRow(existing, incoming, incomingLocked) {
  const mergedSources = unionSpellSources(existing?.sources, incoming?.sources);
  if (!existing) return { ...incoming, locked: incomingLocked, sources: mergedSources };

  const mergeMeta = (a, b) => {
    const srcA = a.sourceInfo || {};
    const srcB = b.sourceInfo || {};
    const mergedSource = {};

    Object.assign(mergedSource, mergeSpellSourceDisplay(srcA, srcB, SRC_COLOR.choice));

    mergedSource.kind = srcA.kind || srcB.kind || undefined;

    const oLabelA = srcA.originLabel || srcA.label || '';
    const oLabelB = srcB.originLabel || srcB.label || '';
    if (!oLabelA) mergedSource.originLabel = oLabelB || undefined;
    else if (!oLabelB) mergedSource.originLabel = oLabelA || undefined;
    else if (isGenericSpellSourceLabel(oLabelA) && !isGenericSpellSourceLabel(oLabelB)) mergedSource.originLabel = oLabelB;
    else mergedSource.originLabel = oLabelA;

    const oTypeA = srcA.originType;
    const oTypeB = srcB.originType;
    if (!oTypeA || oTypeA === 'unknown') mergedSource.originType = oTypeB || oTypeA || 'unknown';
    else if (!oTypeB || oTypeB === 'unknown') mergedSource.originType = oTypeA;
    else if (SPECIAL_ORIGIN.has(oTypeA) && !SPECIAL_ORIGIN.has(oTypeB)) mergedSource.originType = oTypeA;
    else if (SPECIAL_ORIGIN.has(oTypeB) && !SPECIAL_ORIGIN.has(oTypeA)) mergedSource.originType = oTypeB;
    else mergedSource.originType = oTypeA;

    return {
      name: a.name || b.name,
      level: a.level || b.level || 0,
      sourceInfo: mergedSource,
      ownerClassName: b.ownerClassName || a.ownerClassName || null,
      castLevel: b.castLevel != null ? b.castLevel : a.castLevel,
      locked: a.locked || incomingLocked,
      spellcastingAbility: b.spellcastingAbility || a.spellcastingAbility || null,
      spellOverrides: { ...(a.spellOverrides || {}), ...(b.spellOverrides || {}) },
      grantModifiers: [...(a.grantModifiers || []), ...(b.grantModifiers || [])],
      ownerSubclassShortName: b.ownerSubclassShortName || a.ownerSubclassShortName || null,
    };
  };

  const srcA = existing.sourceInfo || {};
  const srcB = incoming.sourceInfo || {};
  const aHasInfo = srcA.label || srcA.kind || srcA.originType;
  const bHasInfo = srcB.label || srcB.kind || srcB.originType;

  let merged;
  if (!aHasInfo && !bHasInfo) {
    merged = { ...existing, ...incoming, locked: existing.locked || incomingLocked };
  } else if (!aHasInfo && bHasInfo) {
    merged = { ...existing, ...incoming, locked: existing.locked || incomingLocked };
  } else if (aHasInfo && !bHasInfo) {
    merged = { ...existing, locked: existing.locked || incomingLocked };
  } else {
    merged = { ...existing, ...mergeMeta(existing, incoming) };
  }

  merged.sources = mergedSources;
  return merged;
}

export function buildSpellInfo(C, spellIndex) {
  const rows = new Map();
  const lockedNames = new Set();
  const freeCastsByKey = new Map();
  const rowKey = (spell, castLevel) => `${lowerKey(spell.name)}|${lowerKey(spell.source)}|${castLevel || spell.level}`;
  const push = (name, source, locked = false, castLevel = null, fallbackLevel = 0, ownerClassName = null, spellcastingAbility = null, freeCasts = null, sources = null, grantMeta = null) => {
    const full = grantMeta?.spellSource
      ? spellIndex.get(`${lowerKey(name)}|${lowerKey(grantMeta.spellSource)}`)
      : spellIndex.get(lowerKey(name));
    // Item cards require the referenced record; never substitute another edition
    // or render an unresolved reference as a level-zero spell.
    if (source?.originType === 'item' && !full) return;
    const canonicalName = full?.name || name;
    const spell = applySpellGrantOverrides(
      { ...(full || {}), name: canonicalName, level: Number(full?.level ?? fallbackLevel ?? 0) },
      grantMeta?.spellOverrides,
    );
    // A scroll's spell is a row of its own: it casts with the scroll's save DC
    // and attack bonus.
    const key = `${rowKey(spell, castLevel)}${scrollRowKey(grantMeta?.scroll)}`;
    const row = {
      ...spell,
      sourceInfo: source,
      sources: (Array.isArray(sources) && sources.length) ? sources : (source ? [source] : []),
      castLevel,
      ownerClassName,
      ownerSubclassShortName: grantMeta?.ownerSubclassShortName || null,
      spellcastingAbility,
      spellOverrides: grantMeta?.spellOverrides || null,
      grantModifiers: grantMeta?.modifiers || [],
      scroll: grantMeta?.scroll || null,
      locked,
    };
    const existing = rows.get(key);
    rows.set(key, mergeRow(existing, row, locked));
    if (locked) {
      lockedNames.add(name);
      lockedNames.add(lowerKey(name));
    }
    if (Array.isArray(freeCasts) && freeCasts.length) {
      freeCastsByKey.set(key, mergeFreeCastsById(freeCastsByKey.get(key) || [], freeCasts));
    }
  };

  (C?.selectedCantrips || []).forEach((name) => pushKnown(name, 0, null, C?.className));
  Object.entries(C?.selectedSpells || {}).forEach(([level, names]) => {
    (names || []).forEach((name) => pushKnown(name, Number(level), null, C?.className));
  });
  (C?.extraClasses || []).forEach((ec) => {
    (ec.selectedCantrips || []).forEach((name) => pushKnown(name, 0, null, ec.name));
    Object.entries(ec.selectedSpells || {}).forEach(([level, names]) => {
      (names || []).forEach((name) => pushKnown(name, Number(level), null, ec.name));
    });
  });

  if (lowerKey(C?.className) === 'wizard') pushWizardRitualBook(C, C.className);
  (C?.extraClasses || []).forEach((ec) => {
    if (lowerKey(ec?.name) === 'wizard') pushWizardRitualBook(ec, ec.name);
  });

  collectAtWillSpells(C).forEach(({ name, source }) => push(name, source, true));
  collectAutoGrantedSpells(C).forEach(({ name, level, source, sources, ownerClassName, ownerSubclassShortName, spellcastingAbility, freeCasts, spellOverrides, modifiers }) => (
    push(name, source, true, null, level, ownerClassName, spellcastingAbility, freeCasts, sources, { ownerSubclassShortName, spellOverrides, modifiers })
  ));
  collectChoiceSpells(C, spellIndex).forEach(({ name, source, ownerClassName, spellcastingAbility, freeCasts }) => push(name, source, true, null, 0, ownerClassName, spellcastingAbility, freeCasts));
  collectFixedFeatSpells(C).forEach(({ name, source, ownerClassName, spellcastingAbility, freeCasts, spellOverrides, modifiers }) => (
    push(name, source, true, null, 0, ownerClassName, spellcastingAbility, freeCasts, null, { spellOverrides, modifiers })
  ));

  // Item-attached spells (Cloak of the Bat, Boots of Levitation, etc.). The
  // `freeCastTemplate` (when set) becomes a normalized free-cast entry so the
  // existing free-cast UI + rest pipeline drive uses/recovery.
  collectItemAttachedSpells(C).forEach((grant) => {
    let freeCasts = null;
    if (grant.freeCastTemplate) {
      const normalized = normalizeFreeCast(grant.freeCastTemplate, {
        character: C,
        sourceType: 'item',
        source: grant.itemName,
        spellName: grant.name,
      });
      if (normalized) freeCasts = [normalized];
    }
    push(grant.name, grant.source, true, null, 0, null, null, freeCasts, null, { spellSource: grant.spellSource });
  });

  collectScrollSpells(C).forEach((grant) => {
    push(grant.name, grant.source, true, null, grant.level, null, null, null, null, {
      spellSource: grant.spellSource,
      scroll: grant.scroll,
    });
  });

  const all = [...rows.values()];
  all.forEach((entry) => {
    Object.assign(entry, resolveSpellMeta(entry, C));
    const fcKey = rowKey(entry, entry.castLevel);
    const fc = freeCastsByKey.get(fcKey);
    if (fc?.length) entry.freeCasts = fc;
  });
  const cantrips = all.filter((entry) => Number(entry.level || 0) === 0 && !entry.isAtWill).sort(sortByName);
  const atWill = all.filter((entry) => entry.isAtWill).sort(sortByName);
  const leveled = {};
  all.filter((entry) => Number(entry.level || 0) > 0 && !entry.isAtWill).forEach((entry) => {
    const level = Number(entry.level || 0);
    if (!leveled[level]) leveled[level] = [];
    leveled[level].push(entry);
  });
  Object.values(leveled).forEach((entries) => entries.sort(sortByName));
  const freeCastDefs = mergeFreeCastsById(all.flatMap((entry) => entry.freeCasts || []));
  return { cantrips, atWill, leveled, lockedNames, freeCastDefs, lockedEntries: all.filter((entry) => entry.locked) };

  function pushKnown(name, level, source, ownerClassName) {
    const full = spellIndex.get(lowerKey(name));
    if (full) push(name, source, false, null, 0, ownerClassName);
    else {
      const key = rowKey({ name, level }, null);
      if (!rows.has(key)) rows.set(key, { name, level: Number(level || 0), sourceInfo: source, sources: source ? [source] : [], ownerClassName });
    }
  }

  function pushWizardRitualBook(bucket, ownerClassName) {
    wizardRitualBookSpells(bucket, spellIndex).forEach(({ name, level }) => {
      push(name, { label: 'Ritual Book', color: SRC_COLOR.ritual, kind: 'ritualBook' }, false, null, level, ownerClassName);
    });
  }
}

// A grant's changes to the spell it grants: no or fewer components, another range.
function applySpellGrantOverrides(spell, overrides) {
  if (!overrides || typeof overrides !== 'object') return spell;
  const next = { ...spell };
  if (overrides.components === 'none') {
    next.components = {};
    next.componentsLabel = 'None';
    next.materialLabel = null;
  } else if (Array.isArray(overrides.removeComponents) && next.components) {
    const removed = new Set(overrides.removeComponents.map((value) => String(value).toLowerCase()));
    next.components = Object.fromEntries(
      Object.entries(next.components).filter(([key]) => !removed.has(key.toLowerCase())),
    );
    // Nothing left (e.g. Telekinetic's V/S-free Mage Hand) reads "None", not blank.
    next.componentsLabel = Object.keys(next.components).length ? null : 'None';
    if (removed.has('m')) next.materialLabel = null;
  }
  if (overrides.rangeLabel) next.rangeLabel = overrides.rangeLabel;
  return next;
}

function sortByName(a, b) {
  return compareText(a.name, b.name);
}

// The tab's action filter chips, and which one a spell falls under.
export const SPELL_ACTION_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Action' },
  { key: 'bonus', label: 'Bonus Action' },
  { key: 'reaction', label: 'Reaction' },
];

export function getSpellActionFilter(entry) {
  const unit = String(entry?.time?.[0]?.unit || '').toLowerCase();
  if (unit === 'bonus') return 'bonus';
  if (unit === 'reaction') return 'reaction';
  if (unit === 'action') return 'action';
  if (unit) return 'other';

  const castingTime = String(entry?.castingTimeLabel || entry?.castingTime || '').toLowerCase();
  if (/\breaction\b/.test(castingTime)) return 'reaction';
  if (/\bbonus\b/.test(castingTime)) return 'bonus';
  if (/\baction\b/.test(castingTime)) return 'action';
  return 'action';
}

// The leveled spells as the tab lists them: each under every slot level it
// can be cast at — a Pact Magic spell at the pact level (and its own level
// when regular slots exist there), an upcastable spell at each higher level
// with a slot, an item's slot-free spell at its own level only.
export function expandSpellInfoBySlots(C, spellInfo, slots) {
  if (!spellInfo) return spellInfo;
  const maxRegular = (slots.regular || []).reduce((m, c, i) => c > 0 ? i + 1 : m, 0);
  const maxPact = slots.pact?.level || 0;
  const maxSlotLv = Math.max(maxRegular, maxPact);
  if (maxSlotLv <= 0) return spellInfo;

  const pactInfo = getPactMagicInfo(C);
  const result = {
    cantrips: spellInfo.cantrips,
    atWill: spellInfo.atWill,
    leveled: {},
    lockedNames: spellInfo.lockedNames,
    lockedEntries: spellInfo.lockedEntries,
  };
  const addLeveledEntry = (slotLevel, nextEntry) => {
    const lv = Number(slotLevel || 0);
    if (lv <= 0) return;
    if (!result.leveled[lv]) result.leveled[lv] = [];
    const castLv = Number(nextEntry?.castLevel || nextEntry?.level || lv);
    const idx = result.leveled[lv].findIndex((existing) => (
      lowerKey(existing?.name) === lowerKey(nextEntry?.name)
      && lowerKey(existing?.source) === lowerKey(nextEntry?.source)
      && Number(existing?.castLevel || existing?.level || lv) === castLv
    ));
    if (idx >= 0) {
      const existing = result.leveled[lv][idx];
      if (existing?.castMode !== 'pact_magic' && nextEntry?.castMode === 'pact_magic') {
        result.leveled[lv][idx] = nextEntry;
      }
      return;
    }
    result.leveled[lv].push(nextEntry);
  };

  Object.entries(spellInfo.leveled).forEach(([level, entries]) => {
    entries.forEach((entry) => {
      if (entry.level <= 0) return;
      if (entry.originType === 'item' && entry.consumesSlot === false) {
        addLeveledEntry(Number(level), {
          ...entry,
          castLevel: Number(level),
          castMode: entry.originType === 'item' ? 'item' : (entry.castMode || 'regular'),
        });
        return;
      }
      const baseLevel = Number(level);
      const castMode = getSpellCastMode(C, entry, pactInfo);
      if (castMode.mode === 'pact_magic') {
        const pactLevel = Number(castMode.castLevel || baseLevel);
        addLeveledEntry(pactLevel, { ...entry, castLevel: pactLevel, castMode: 'pact_magic' });
        if (slots.regular?.[baseLevel - 1] > 0) {
          addLeveledEntry(baseLevel, { ...entry, castLevel: baseLevel, castMode: 'regular' });
        }
      } else {
        addLeveledEntry(baseLevel, { ...entry, castLevel: baseLevel, castMode: castMode.mode || 'regular' });
      }
    });
  });

  Object.entries(spellInfo.leveled).forEach(([level, entries]) => {
    entries.forEach((entry) => {
      if (entry.level <= 0) return;
      if (entry.originType === 'item' && entry.consumesSlot === false) return;
      if (entry.ritualOnly) return;
      if (!entry.entriesHigherLevel) return;
      const baseLevel = Number(level);
      const castMode = getSpellCastMode(C, entry, pactInfo);
      for (let lv = baseLevel + 1; lv <= maxSlotLv; lv++) {
        const hasRegularSlot = slots.regular?.[lv - 1] > 0;
        const hasPactSlot = slots.pact?.level === lv && slots.pact.count > 0;
        // The allowance belongs to the granted spell, not to every upcast row.
        const upcastEntry = { ...entry, freeCasts: undefined, castLevel: lv };
        if (castMode.mode === 'pact_magic') {
          if (hasRegularSlot) addLeveledEntry(lv, { ...upcastEntry, castMode: 'regular' });
        } else if (hasRegularSlot || hasPactSlot) {
          addLeveledEntry(lv, { ...upcastEntry, castMode: castMode.mode || 'regular' });
        }
      }
    });
  });
  return result;
}
