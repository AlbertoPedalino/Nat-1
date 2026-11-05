import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { isRitualSpell } from '../../../shared/character/spells/spellTags.js';
import { filterByRequiredChoice } from '../../../shared/character/progression/lineageMatch.js';
import { isGrantUnlocked } from '../../../shared/character/spells/spellGrants.js';
import { enumerateAutoGrantedSpells, grantSourceLabel } from '../../../shared/character/spells/autoGrantedSpells.js';
import { featSlotOrigin } from '../../../shared/character/progression/featChoiceKeys.js';
import { collectFreeCastsForGrant, mergeFreeCastsById, normalizeFreeCast, getFeatFreeCastTemplate, applyFreeCastRest } from '../../../shared/character/spells/spellFreeCasts.js';
import { collectItemAttachedSpells } from '../../../shared/character/inventory/itemAttachedSpells.js';
import { collectScrollSpells, scrollRowKey } from '../../../shared/character/inventory/spellScrolls.js';
import { isWarlockModifierCantripChoiceKey } from '../../../shared/character/progression/warlockUtils.js';
import { enumerateFixedAdditionalSpells } from '../../../shared/character/spells/additionalSpellGrants.js';
import { ENTITY_COLORS, ITEM_ATTUNEMENT, ACTION_COLORS } from '../../../shared/ui/entityColors.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import {
  isGenericSpellSourceLabel,
  mergeSpellSourceDisplay,
} from './spellSourceDisplay.js';
import { spellModifierEntities } from './spellModifiers.js';

// The Spells tab's list: every spell the character has, from each source
// (class, subclass, species, feats, items, scrolls, at-will grants), merged into
// one row per spell with its sources, preparation status and free casts; plus
// spellcasting ability per entry and the snapshots stored on the character.
// Slots and limits: spellcasting.js. Dice: spellDice.js. Riders and modifiers:
// spellModifiers.js.

// Display colors for spell-source tags. Entity-linked tags follow the canonical
// entity palette (shared/entityColors.js); the rest are spell-domain-only tags.
const SRC_COLOR = {
  class: ENTITY_COLORS.class,
  subclass: ENTITY_COLORS.subclass,
  species: ENTITY_COLORS.species,
  background: ENTITY_COLORS.background,
  feat: ENTITY_COLORS.feat,
  item: ITEM_ATTUNEMENT,
  granted: '#70b7a6',
  choice: '#9d7fb8',
  ritual: '#58b879',
  arcanum: '#d69245',
};

// Feats granted by a background/species slot are tagged with that entity's
// color so the chip shows where the feat came from (e.g. Magic Initiate via
// Acolyte → background orange). Free feat slots (ASI etc.) stay feat red.
function featSlotTone(slotOrChoiceKey) {
  return SRC_COLOR[featSlotOrigin(slotOrChoiceKey)];
}

const _PREP_RANK = {
  at_will: 0, mystic_arcanum: 1, item_cast: 2, ritual_spellbook: 3, always_prepared: 4,
  free_cast: 5, prepared: 6, known: 7, granted: 8, spellbook: 9, cantrip: 10,
  unknown: 11,
};

const _SPECIAL_ORIGIN = new Set(['at_will', 'invocation', 'mystic_arcanum', 'spellbook']);

// Union of contributing sources across merged duplicates of the same spell,
// deduped by origin label. Lets the UI show every source a spell came from
// (e.g. a Forest Gnome Druid's Speak with Animals) on a single consolidated row.
function _unionSources(a, b) {
  const out = [];
  const seen = new Set();
  [...(a || []), ...(b || [])].forEach((src) => {
    if (!src) return;
    const key = norm(src.originLabel || src.label || '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(src);
  });
  return out;
}

function _mergeRow(existing, incoming, incomingLocked) {
  const mergedSources = _unionSources(existing?.sources, incoming?.sources);
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
    else if (_SPECIAL_ORIGIN.has(oTypeA) && !_SPECIAL_ORIGIN.has(oTypeB)) mergedSource.originType = oTypeA;
    else if (_SPECIAL_ORIGIN.has(oTypeB) && !_SPECIAL_ORIGIN.has(oTypeA)) mergedSource.originType = oTypeB;
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
  const rowKey = (spell, castLevel) => `${norm(spell.name)}|${norm(spell.source)}|${castLevel || spell.level}`;
  const push = (name, source, locked = false, castLevel = null, fallbackLevel = 0, ownerClassName = null, spellcastingAbility = null, freeCasts = null, sources = null, grantMeta = null) => {
    const full = grantMeta?.spellSource
      ? spellIndex.get(`${norm(name)}|${norm(grantMeta.spellSource)}`)
      : spellIndex.get(norm(name));
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
    rows.set(key, _mergeRow(existing, row, locked));
    if (locked) {
      lockedNames.add(name);
      lockedNames.add(norm(name));
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

  if (norm(C?.className) === 'wizard') pushWizardRitualBook(C, C.className);
  (C?.extraClasses || []).forEach((ec) => {
    if (norm(ec?.name) === 'wizard') pushWizardRitualBook(ec, ec.name);
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
    const full = spellIndex.get(norm(name));
    if (full) push(name, source, false, null, 0, ownerClassName);
    else {
      const key = rowKey({ name, level }, null);
      if (!rows.has(key)) rows.set(key, { name, level: Number(level || 0), sourceInfo: source, sources: source ? [source] : [], ownerClassName });
    }
  }

  function pushWizardRitualBook(bucket, ownerClassName) {
    const selectedCantrips = bucket?.selectedCantrips || [];
    const selectedSpells = bucket?.selectedSpells || {};
    Object.entries(normalizeWizardBook(bucket?.wizardSpellbook)).forEach(([level, names]) => {
      const spellLevel = Number(level || 0);
      const selectedAtLevel = spellLevel === 0 ? selectedCantrips : (selectedSpells[spellLevel] || selectedSpells[String(spellLevel)] || []);
      (names || []).forEach((name) => {
        if (!name) return;
        if ((selectedAtLevel || []).some((entry) => norm(entry) === norm(name))) return;
        const full = spellIndex.get(norm(name));
        if (!isRitualSpell(full)) return;
        push(name, { label: 'Ritual Book', color: SRC_COLOR.ritual, kind: 'ritualBook' }, false, null, spellLevel, ownerClassName);
      });
    });
  }
}

export function getFreeCastDefsForCharacter(C) {
  const defs = [];
  const speciesCfg = installedRegistry.getSpeciesRuntimeConfig(C?.speciesName, C?.speciesSource)?.spellcasting || {};
  filterByRequiredChoice([
    ...(speciesCfg.alwaysKnownSpells || []),
    ...(speciesCfg.alwaysPreparedSpells || []),
  ], C).forEach((entry) => {
    if (Number(C?.level || 1) < Number(entry.minLevel || 1)) return;
    defs.push(...collectFreeCastsForGrant(entry, {
      character: C,
      ownerLevel: Number(C?.level || 1),
      source: entry.source || C?.speciesName,
      sourceType: entry.sourceType || 'species',
      spellName: entry.name,
    }));
  });

  spellModifierEntities(C).forEach(({ className, subclassShortName, level }) => {
    const cfgs = [
      { cfg: installedRegistry.getClassRuntimeConfig(className), type: 'class', label: className },
      { cfg: installedRegistry.getSubclassRuntimeConfig(className, subclassShortName), type: 'subclass', label: subclassShortName || className },
    ];
    cfgs.forEach(({ cfg, type, label }) => {
      const sp = cfg?.spellcasting;
      if (!sp) return;
      [...(sp.alwaysKnownSpells || []), ...(sp.alwaysPreparedSpells || [])].forEach((entry) => {
        if (Number(level || 1) < Number(entry?.minLevel || 1)) return;
        defs.push(...collectFreeCastsForGrant(entry, {
          character: C,
          ownerLevel: Number(level || 1),
          source: entry.source || label,
          sourceType: entry.sourceType || type,
          spellName: entry.name,
        }));
      });
    });
  });

  const featMeta = _buildFeatMetaMap(C);
  Object.entries(C?.choices || {}).forEach(([key, value]) => {
    const slotKey = _getSlotKey(C, key);
    const meta = slotKey ? featMeta.get(slotKey) : null;
    if (!meta) return;
    const isCantrip = _choiceKeyIsCantripChoice(key);
    const tpl = getFeatFreeCastTemplate(meta.name, { isCantrip });
    if (!tpl) return;
    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const name = entry.split('|')[0].trim();
      if (!name) return;
      const fc = normalizeFreeCast(tpl, { character: C, sourceType: 'feat', source: meta.name, spellName: name });
      if (fc) defs.push(fc);
    });
  });
  collectFixedFeatSpells(C).forEach((grant) => {
    defs.push(...(grant.freeCasts || []));
  });

  // Item-attached spells with daily/limited uses (Cloak of the Bat, etc.).
  collectItemAttachedSpells(C).forEach((grant) => {
    if (!grant.freeCastTemplate) return;
    const fc = normalizeFreeCast(grant.freeCastTemplate, {
      character: C,
      sourceType: 'item',
      source: grant.itemName,
      spellName: grant.name,
    });
    if (fc) defs.push(fc);
  });

  return mergeFreeCastsById(defs);
}

function _choiceKeyIsCantripChoice(key) {
  const m = String(key || '').match(/_spell_(?:known|innate|prepared|expanded)_\d+_(\d+)\|/);
  if (m) return Number(m[1]) === 0;
  return /(^|_)cantrip(s)?(_|$)/i.test(String(key || ''));
}

export { applyFreeCastRest };

function _choiceValue(raw) {
  if (raw == null) return null;
  const val = Array.isArray(raw) ? raw[0] : raw;
  return typeof val === 'string' ? val : null;
}

function _normalizeAbility(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const n = raw.toLowerCase().replace(/[^a-z]/g, '').trim();
  if (n === 'intelligence') return 'int';
  if (n === 'wisdom') return 'wis';
  if (n === 'charisma') return 'cha';
  if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(n)) return n;
  return null;
}

function _extractChoiceSpellSlotKey(key) {
  const m = String(key || '').match(/^(.*?)_spell_(?:known|innate|prepared|expanded)_/);
  return m ? m[1] : null;
}

function _slotKeyBase(slotKey) {
  return String(slotKey || '').replace(/^mc\d+_/, '');
}

function _isFeatLikeSlotKey(C, slotKey) {
  const key = String(slotKey || '');
  const baseKey = _slotKeyBase(key);
  return (
    baseKey === 'feat_origin'
    || baseKey === 'species_origin_feat'
    || baseKey.startsWith('feat_')
    || baseKey.includes('boon')
    || baseKey.includes('fighting_style')
    || /^mc\d+_feat_/.test(key)
    || Object.prototype.hasOwnProperty.call(C?.normalizedChoices?.feats?.byKey || {}, key)
    || Object.prototype.hasOwnProperty.call(C?.normalizedChoices?.feats?.byKey || {}, baseKey)
  );
}

function getChoiceSpellAbility(C, key) {
  const slotKey = _extractChoiceSpellSlotKey(key);
  if (slotKey) {
    const abilityKey = `${slotKey}_spell_ability`;
    const raw = C?.choices?.[abilityKey];
    const val = _choiceValue(raw);
    if (val) {
      const normalized = _normalizeAbility(val);
      if (normalized) return normalized;
    }
  }
  if (String(key || '').startsWith('species_')) {
    const speciesAbility = C?.normalizedChoices?.species?.spellAbility
      || _choiceValue(C?.choices?.species_spell_ability);
    const normalized = _normalizeAbility(speciesAbility);
    if (normalized) return normalized;
  }
  return null;
}

function _findFeatName(C, slotKey) {
  if (!C || !slotKey) return null;

  const direct = C?.choices?.[slotKey];
  if (direct && typeof direct === 'string' && !direct.startsWith('feat_')) return direct;

  const norm = C?.normalizedChoices;
  if (norm) {
    try {
      const byKey = norm.feats?.byKey?.[slotKey];
      if (byKey && typeof byKey === 'string') return byKey;
    } catch {}
  }
  return null;
}

function _buildFeatMetaMap(C) {
  const map = new Map();
  const choices = C?.choices || {};
  const snapshots = Array.isArray(C?.allFeatSnapshots) ? C.allFeatSnapshots : [];
  const snapshotByName = new Map(snapshots.map((feat) => [norm(feat?.name), feat]));
  const addMeta = (slotKey, name) => {
    const snapshot = snapshotByName.get(norm(name));
    if (!slotKey || !snapshot || map.has(slotKey)) return;
    const abilityKey = `${slotKey}_spell_ability`;
    const ability = _normalizeAbility(
      _choiceValue(choices[abilityKey])
      || _choiceValue(choices[`${slotKey}_asi`])
      || _choiceValue(choices[`${slotKey}_first_asi`]),
    );
    map.set(slotKey, { name: snapshot.name, ability, snapshot });
  };

  Object.entries(choices).forEach(([key, value]) => {
    if (!_isFeatLikeSlotKey(C, key)) return;
    const selected = _choiceValue(value);
    if (selected) addMeta(key, selected);
  });
  Object.entries(C?.normalizedChoices?.feats?.byKey || {}).forEach(([key, value]) => {
    addMeta(key, value);
  });
  Object.keys(choices).forEach((key) => {
    const slotKey = _extractChoiceSpellSlotKey(key);
    if (!slotKey || !_isFeatLikeSlotKey(C, slotKey)) return;
    addMeta(slotKey, _findFeatName(C, slotKey));
  });

  const mappedNames = new Set([...map.values()].map((meta) => norm(meta.name)));
  snapshots.forEach((snapshot, index) => {
    if (!snapshot?.name || mappedNames.has(norm(snapshot.name))) return;
    map.set(`feat_snapshot_${index}`, { name: snapshot.name, ability: null, snapshot });
  });
  return map;
}

function collectFixedFeatSpells(C) {
  const out = [];
  _buildFeatMetaMap(C).forEach((meta, slotKey) => {
    const grants = enumerateFixedAdditionalSpells(meta.snapshot?.additionalSpells, {
      entryIndex: C?.choices?.[`${slotKey}_entry`],
      chosenAbility: meta.ability,
      spellOverrides: meta.snapshot?.spellGrantOverrides,
      defaultCanAlsoUseSlots: true,
    });
    grants.forEach((grant) => {
      if (Number(C?.level || 1) < Number(grant.minLevel || 1)) return;
      const freeCasts = grant.freeCast
        ? [normalizeFreeCast(grant.freeCast, {
            character: C,
            sourceType: 'feat',
            source: meta.name,
            spellName: grant.name,
          })].filter(Boolean)
        : [];
      out.push({
        name: grant.name,
        source: {
          label: meta.name,
          color: featSlotTone(slotKey),
          originType: 'feat',
          originLabel: meta.name,
        },
        ownerClassName: _ownerClassFromChoiceKey(C, slotKey),
        spellcastingAbility: _normalizeAbility(grant.ability || meta.ability),
        freeCasts,
        spellOverrides: grant.spellOverrides,
        modifiers: grant.modifiers,
      });
    });
  });
  return out;
}

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

function _getSlotKey(C, key) {
  const slotKey = _extractChoiceSpellSlotKey(key);
  if (!slotKey || !_isFeatLikeSlotKey(C, slotKey)) return null;
  return slotKey;
}

function _ownerClassFromChoiceKey(C, key) {
  const m = String(key || '').match(/^mc(\d+)_/);
  if (m) {
    const idx = Number(m[1]);
    return C?.extraClasses?.[idx]?.name || null;
  }
  return C?.className || null;
}

function _speciesChoiceKeyLineage(key) {
  const m = String(key || '').match(/^species_(.+?)_(cantrip|spell)(?:_|$)/);
  if (!m) return null;
  return m[1].replace(/_/g, '').toLowerCase();
}

function _speciesChoiceKeyMatchesActiveLineage(C, key) {
  const keyLineage = _speciesChoiceKeyLineage(key);
  if (!keyLineage) return true;
  const stored = String(C?.normalizedChoices?.species?.version || C?.choices?.species_version || '');
  const storedNorm = stored.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !storedNorm || storedNorm === keyLineage;
}

function collectChoiceSpells(C, spellIndex) {
  const featMetaMap = _buildFeatMetaMap(C);
  const out = [];
  Object.entries(C?.choices || {}).forEach(([key, value]) => {
    const cleanKey = key.replace(/^mc\d+_/, '');
    if (isWarlockModifierCantripChoiceKey(cleanKey)) return;
    if (!_speciesChoiceKeyMatchesActiveLineage(C, cleanKey)) return;
    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const name = entry.split('|')[0].trim();
      if (!name) return;
      if (!spellIndex.has(norm(name)) && !/(spell|cantrip|tome|magical|known|prepared|innate|expanded)/i.test(key)) return;
      if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(norm(name))) return;
      const slotKey = _getSlotKey(C, key);
      const meta = slotKey ? featMetaMap.get(slotKey) : null;
      const ownerClassName = _ownerClassFromChoiceKey(C, key);
      const spellLevelInfo = spellIndex.get(norm(name));
      const isCantrip = Number(spellLevelInfo?.level || 0) === 0 || _choiceKeyIsCantripChoice(key);
      if (meta) {
        const featTpl = getFeatFreeCastTemplate(meta.name, { isCantrip });
        const freeCasts = featTpl
          ? [normalizeFreeCast(featTpl, { character: C, sourceType: 'feat', source: meta.name, spellName: name })].filter(Boolean)
          : [];
        out.push({
          name,
          source: { label: meta.name, color: featSlotTone(slotKey || key), originType: 'feat', originLabel: meta.name },
          spellcastingAbility: meta.ability,
          ownerClassName,
          freeCasts,
        });
      } else {
        out.push({
          name,
          source: sourceFromChoiceKey(C, key),
          spellcastingAbility: getChoiceSpellAbility(C, key),
          ownerClassName,
        });
      }
    });
  });
  return out;
}

function collectAutoGrantedSpells(C) {
  // Single shared entry point: class runtime config + subclass-feature text +
  // species, all gated & level-filtered. Project each canonical record into the
  // sheet's source-object shape (branching only on species vs class origin).
  const runtimeOut = enumerateAutoGrantedSpells(C).map((r) => {
    if (r.origin === 'species') {
      const srcLabel = grantSourceLabel(r, C?.speciesName || 'Species');
      const sourceType = r.sourceType || 'species';
      return {
        name: r.name,
        level: Number(r.level ?? 0),
        source: { label: srcLabel, color: SRC_COLOR.species, originType: 'species', originLabel: C?.speciesName || 'Species' },
        ownerClassName: null,
        spellcastingAbility: r.ability,
        freeCasts: collectFreeCastsForGrant(r.entry, { character: C, ownerLevel: r.ownerLevel, source: srcLabel, sourceType, spellName: r.name }),
        spellOverrides: r.entry?.spellOverrides || null,
        modifiers: r.entry?.modifiers || [],
      };
    }
    const srcLabel = grantSourceLabel(r);
    const sourceType = r.sourceType || (r.explicitSource ? 'auto_granted' : (r.subclassShortName ? 'subclass' : 'class'));
    return {
      name: r.name,
      level: Number(r.level ?? 0),
      source: { label: srcLabel, color: SRC_COLOR[sourceType] || SRC_COLOR.granted, originType: sourceType, originLabel: srcLabel },
      ownerClassName: r.ownerClassName,
      ownerSubclassShortName: r.subclassShortName,
      spellcastingAbility: r.ability,
      freeCasts: collectFreeCastsForGrant(r.entry, { character: C, ownerLevel: r.ownerLevel, source: srcLabel, sourceType, spellName: r.name }),
      spellOverrides: r.entry?.spellOverrides || null,
      modifiers: r.entry?.modifiers || [],
    };
  });

  // Collapse same-named grants to one entry, but accumulate every contributing
  // source (and their free casts) so a spell granted by multiple origins — e.g.
  // a Forest Gnome Druid's Speak with Animals — keeps all its source tags.
  const runtimeByName = new Map();
  runtimeOut.forEach((entry) => {
    const key = norm(entry.name);
    if (!key) return;
    const existing = runtimeByName.get(key);
    if (existing) {
      existing.sources = _unionSources(existing.sources, [entry.source]);
      if (entry.freeCasts?.length) existing.freeCasts = mergeFreeCastsById(existing.freeCasts || [], entry.freeCasts);
      existing.spellcastingAbility = existing.spellcastingAbility || entry.spellcastingAbility;
      existing.ownerClassName = existing.ownerClassName || entry.ownerClassName;
      existing.ownerSubclassShortName = existing.ownerSubclassShortName || entry.ownerSubclassShortName;
      existing.spellOverrides = { ...(existing.spellOverrides || {}), ...(entry.spellOverrides || {}) };
      existing.modifiers = [...(existing.modifiers || []), ...(entry.modifiers || [])];
    } else {
      runtimeByName.set(key, { ...entry, sources: [entry.source] });
    }
  });

  (C?.autoGrantedSpells || []).forEach((entry) => {
    if (!entry?.name) return;
    const key = norm(entry.name);
    if (runtimeByName.has(key)) return;
    // Check invocation requirement from runtime config before falling back to saved data
    const ownerClass = entry.ownerClassName || C?.className;
    const cfg = ownerClass ? installedRegistry.getClassRuntimeConfig(ownerClass)?.spellcasting : null;
    const allCfgSpells = [...(cfg?.alwaysKnownSpells || []), ...(cfg?.alwaysPreparedSpells || [])];
    const cfgEntry = allCfgSpells.find((s) => norm(s?.name || '') === key);
    if (cfgEntry && !isGrantUnlocked(cfgEntry, C)) return;
    const fallbackSource = { label: entry.source || 'Auto', color: SRC_COLOR[entry.sourceType] || SRC_COLOR.granted, originType: entry.sourceType || 'auto_granted', originLabel: entry.source || 'Auto' };
    runtimeByName.set(key, {
      name: entry.name,
      level: Number(entry.level ?? 0),
      source: fallbackSource,
      sources: [fallbackSource],
      ownerClassName: ownerClass,
      spellcastingAbility: entry.spellcastingAbility || entry.ability || null,
    });
  });

  return [...runtimeByName.values()];
}

function collectAtWillSpells(C) {
  const out = [];
  const entities = [{ name: C?.className, level: primaryClassLevel(C) }, ...(C?.extraClasses || []).map((ec) => ({ name: ec.name, level: ec.level || 1 }))];
  entities.forEach((entity) => {
    (installedRegistry.getClassAtWillSpells(entity.name) || []).forEach((entry) => {
      if (entity.level < Number(entry.minLevel || 1)) return;
      if (!isGrantUnlocked(entry, C)) return;
      out.push({ name: entry.spell, source: { label: entry.invocation || 'At Will', color: SRC_COLOR.choice, kind: 'atWill', originType: 'invocation', originLabel: entry.invocation || 'At Will' } });
    });
  });
  return out;
}

function _findFeatNameByPrefix(C, key) {
  if (!key || typeof key !== 'string') return null;
  const m = key.match(/^(feat_.+?)_spell_(?:known|innate|prepared|expanded)_/);
  if (!m) return null;
  const prefix = m[1];
  let name = C?.choices?.[prefix];
  if (name && typeof name === 'string' && !name.startsWith('feat_')) return name;
  const parts = prefix.split('_');
  for (let i = parts.length - 1; i > 0; i--) {
    const testKey = parts.slice(0, i).join('_');
    if (testKey === 'feat') break;
    const val = C?.choices?.[testKey];
    if (val && typeof val === 'string' && !val.startsWith('feat_')) return val;
  }
  return null;
}

function _findFeatNameByScanning(C, key) {
  if (!key || !C?.choices) return null;
  const keyPrefix = key.split('_spell_')[0];
  if (!keyPrefix || !keyPrefix.startsWith('feat_')) return null;
  const abilityKey = `${keyPrefix}_spell_ability`;
  if (abilityKey in C.choices) {
    const val = C?.choices?.[keyPrefix];
    if (val && typeof val === 'string' && !val.startsWith('feat_')) return val;
  }
  for (const [ck, cv] of Object.entries(C.choices)) {
    if (ck === abilityKey || ck.startsWith(`${keyPrefix}_spell_ability`)) {
      const val = C?.choices?.[keyPrefix];
      if (val && typeof val === 'string' && !val.startsWith('feat_')) return val;
    }
  }
  return null;
}

function sourceFromChoiceKey(C, key) {
  const grantKey = key.match(/^(.*)_(known|innate|prepared|expanded)_/i)?.[1];
  let featName = grantKey ? C?.choices?.[grantKey] : null;
  if (!featName && grantKey) {
    const shortened = grantKey.replace(/_[^_]+$/, '');
    if (shortened !== grantKey) featName = C?.choices?.[shortened] || null;
  }
  if (!featName) featName = _findFeatNameByPrefix(C, key);
  if (!featName) featName = _findFeatNameByScanning(C, key);
  if (!featName) {
    const slotKey = _getSlotKey(C, key);
    if (slotKey) featName = _findFeatName(C, slotKey);
  }
  if (featName) return { label: String(featName), color: featSlotTone(key), originType: 'feat', originLabel: String(featName) };
  if (key.startsWith('feat_')) return { label: 'Feat', color: featSlotTone(key), originType: 'feat', originLabel: 'Feat' };
  if (key.startsWith('subclass_')) return { label: C?.subclassShortName || 'Subclass', color: SRC_COLOR.subclass, originType: 'subclass', originLabel: C?.subclassShortName || 'Subclass' };
  if (key.startsWith('species_')) {
    const lineage = C?.normalizedChoices?.species?.version
      || (Array.isArray(C?.choices?.species_version) ? C.choices.species_version[0] : C?.choices?.species_version);
    if (_speciesChoiceKeyLineage(key) && lineage) {
      return { label: `${lineage} Lineage`, color: SRC_COLOR.species, originType: 'species', originLabel: String(lineage) };
    }
    return { label: C?.speciesName || 'Species', color: SRC_COLOR.species, originType: 'species', originLabel: C?.speciesName || 'Species' };
  }
  if (key.includes('tome')) return { label: 'Pact of the Tome', color: SRC_COLOR.choice, originType: 'invocation', originLabel: 'Pact of the Tome' };
  if (key.includes('mystic_arcanum')) return { label: 'M. Arcanum', color: SRC_COLOR.arcanum, originType: 'mystic_arcanum', originLabel: 'Mystic Arcanum' };
  if (key.startsWith('warlock_')) {
    var invName = key.replace(/^warlock_/, '').replace(/_(cantrip|ritual).*$/, '').replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    if (invName) return { label: invName, color: SRC_COLOR.choice, originType: 'invocation', originLabel: invName };
  }
  return { label: 'Choice', color: SRC_COLOR.choice, originType: 'unknown', originLabel: 'Choice' };
}

// A wizard's spellbook by level: names only, once each (case-insensitive).
export function normalizeWizardBook(book) {
  const next = {};
  for (let level = 0; level <= 9; level++) {
    const seen = new Set();
    next[level] = [];
    (book?.[level] || []).forEach((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.name;
      const key = norm(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      next[level].push(name);
    });
  }
  return next;
}

export function getSpellAbility(C) {
  const clsCfg = installedRegistry.getClassRuntimeConfig(C?.className)?.spellcasting;
  const subCfg = installedRegistry.getSubclassRuntimeConfig(C?.className, C?.subclassShortName)?.spellcasting;
  return String(subCfg?.ability || clsCfg?.ability || C?.choices?.species_spell_ability || 'cha').toLowerCase();
}

export function resolveEntrySpellAbility(C, entry = {}) {
  const raw = entry.spellcastingAbility || entry.castAbility || entry.spellAbility || entry.ability || null;
  const normalized = _normalizeAbility(raw);
  if (normalized) return normalized;
  if (entry.ownerClassName) {
    const clsCfg = installedRegistry.getClassRuntimeConfig(entry.ownerClassName)?.spellcasting;
    const subCfg = installedRegistry.getSubclassRuntimeConfig(entry.ownerClassName, entry.ownerSubclassShortName)?.spellcasting;
    const ownerAbility = subCfg?.ability || clsCfg?.ability || null;
    if (ownerAbility) return String(ownerAbility).toLowerCase();
  }
  const speciesAbility = _choiceValue(C?.choices?.species_spell_ability);
  if (speciesAbility) {
    const sa = _normalizeAbility(speciesAbility);
    if (sa) return sa;
  }
  const clsCfg = installedRegistry.getClassRuntimeConfig(C?.className)?.spellcasting;
  const subCfg = installedRegistry.getSubclassRuntimeConfig(C?.className, C?.subclassShortName)?.spellcasting;
  const primaryAbility = subCfg?.ability || clsCfg?.ability || null;
  if (primaryAbility) return String(primaryAbility).toLowerCase();
  return null;
}

export function getSpellAbilityForEntry(C, entry = {}) {
  return resolveEntrySpellAbility(C, entry) || getSpellAbility(C);
}

const _PREP_CFG_CACHE = new Map();
function _getPrepMode(className) {
  if (!className) return null;
  const key = norm(className);
  let mode = _PREP_CFG_CACHE.get(key);
  if (mode === undefined) {
    try {
      const cfg = installedRegistry.getClassRuntimeConfig(className)?.spellcasting;
      mode = cfg?.preparedMode || 'prepared';
    } catch { mode = 'prepared'; }
    _PREP_CFG_CACHE.set(key, mode);
  }
  return mode;
}

function resolveSpellMeta(entry, C) {
  const ownerClass = entry.ownerClassName || C?.className;
  const mode = ownerClass ? _getPrepMode(ownerClass) : null;
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

const _STATUS_CHIP_CONFIG = {
  ritual_spellbook: { label: 'Ritual Book', color: SRC_COLOR.ritual },
  at_will: { label: 'At Will', color: SRC_COLOR.choice },
  mystic_arcanum: { label: 'M. Arcanum', color: SRC_COLOR.arcanum },
  granted: { label: 'Granted', color: SRC_COLOR.granted },
  known: { label: 'Known', color: SRC_COLOR.ritual },
};

export function getSpellStatusChips(entry) {
  const chips = [];
  if (entry.originType === 'item') return chips;
  const state = entry.preparationState;
  if (!state || !_STATUS_CHIP_CONFIG[state]) return chips;
  if (entry.sourceInfo?.kind === 'ritualBook') return chips;
  if (entry.sourceInfo?.kind === 'atWill') return chips;
  if ((entry.originType === 'feat' || entry.originType === 'species') && state === 'granted') return chips;
  const cfg = _STATUS_CHIP_CONFIG[state];
  chips.push({ key: state, label: cfg.label, color: cfg.color, bg: `${cfg.color}1a` });
  return chips;
}

export function getCastBadge(spell) {
  const unit = spell?.time?.[0]?.unit || '';
  if (unit === 'bonus') return { label: 'BA', color: ACTION_COLORS.bonus };
  if (unit === 'reaction') return { label: 'RE', color: ACTION_COLORS.reaction };
  if (unit === 'action' || unit === '') return { label: 'A', color: ACTION_COLORS.action };
  return { label: unit, color: '#c4b393' };
}

export function toSnapshot(spell) {
  return {
    name: spell.name,
    level: spell.level ?? 0,
    school: spell.school,
    source: spell.source,
    components: spell.components,
    duration: spell.duration,
    range: spell.range,
    time: spell.time,
    ritual: !!spell.ritual,
    concentration: !!spell.concentration,
    entries: spell.entries || [],
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
  };
}

export function upsertSnapshot(snapshots, snapshot) {
  const idx = snapshots.findIndex((entry) => norm(entry.name) === norm(snapshot.name));
  if (idx >= 0) return snapshots.map((entry, index) => (index === idx ? { ...entry, ...snapshot } : entry));
  return [...snapshots, snapshot];
}

function sortByName(a, b) {
  return String(a.name).localeCompare(String(b.name));
}

export function dedupeSpells(spells) {
  const seen = new Set();
  return (spells || []).filter((spell) => {
    const key = norm(spell?.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function norm(value) {
  return String(value || '').toLowerCase();
}
