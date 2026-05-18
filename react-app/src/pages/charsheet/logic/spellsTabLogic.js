import { FULL_SLOTS, HALF_SLOTS, PACT_SLOTS, THIRD_SLOTS } from '../../charbuilder/constants.js';
import { installedRegistry } from '../../../adapters/index.js';
import { entriesToPlainText, entriesToTextBlocks, renderEntries as renderSafeEntries } from './renderEntries.js';
import { getFinal as getFinalScore, getMod as getAbilityMod } from './calculations.js';
import { isRitualSpell } from '../../../shared/spellTags.js';
import { warlockHasInvocation } from '../../../shared/character/warlockUtils.js';
import { getClassSpellLimits } from '../../../shared/character/spellProgression.js';

const _GENERIC_LABELS = new Set([
  'class', 'subclass', 'species', 'feat', 'feature', 'granted', 'auto',
  'auto granted', 'always prepared', 'unknown', 'choice',
]);

function _isGenericLabel(label) {
  return _GENERIC_LABELS.has(String(label || '').trim().toLowerCase());
}

const _PREP_RANK = {
  at_will: 0, mystic_arcanum: 1, ritual_spellbook: 2, always_prepared: 3,
  free_cast: 4, prepared: 5, known: 6, granted: 7, spellbook: 8, cantrip: 9,
  unknown: 10,
};

const _SPECIAL_ORIGIN = new Set(['at_will', 'invocation', 'mystic_arcanum', 'spellbook']);

function _mergeRow(existing, incoming, incomingLocked) {
  if (!existing) return { ...incoming, locked: incomingLocked };

  const mergeMeta = (a, b) => {
    const srcA = a.sourceInfo || {};
    const srcB = b.sourceInfo || {};
    const mergedSource = {};

    if (!srcA.label && !srcB.label) mergedSource.label = undefined;
    else if (!srcA.label) mergedSource.label = srcB.label;
    else if (!srcB.label) mergedSource.label = srcA.label;
    else if (_isGenericLabel(srcA.label) && !_isGenericLabel(srcB.label)) mergedSource.label = srcB.label;
    else mergedSource.label = srcA.label;

    mergedSource.color = srcB.color || srcA.color || '#9d7fb8';

    mergedSource.kind = srcA.kind || srcB.kind || undefined;

    const oLabelA = srcA.originLabel || srcA.label || '';
    const oLabelB = srcB.originLabel || srcB.label || '';
    if (!oLabelA) mergedSource.originLabel = oLabelB || undefined;
    else if (!oLabelB) mergedSource.originLabel = oLabelA || undefined;
    else if (_isGenericLabel(oLabelA) && !_isGenericLabel(oLabelB)) mergedSource.originLabel = oLabelB;
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
    };
  };

  const srcA = existing.sourceInfo || {};
  const srcB = incoming.sourceInfo || {};
  const aHasInfo = srcA.label || srcA.kind || srcA.originType;
  const bHasInfo = srcB.label || srcB.kind || srcB.originType;

  if (!aHasInfo && !bHasInfo) {
    return { ...existing, ...incoming, locked: existing.locked || incomingLocked };
  }
  if (!aHasInfo && bHasInfo) {
    return { ...existing, ...incoming, locked: existing.locked || incomingLocked };
  }
  if (aHasInfo && !bHasInfo) {
    return { ...existing, locked: existing.locked || incomingLocked };
  }

  return { ...existing, ...mergeMeta(existing, incoming) };
}

export function buildSpellInfo(C, spellIndex) {
  const rows = new Map();
  const lockedNames = new Set();
  const push = (name, source, locked = false, castLevel = null, fallbackLevel = 0, ownerClassName = null, spellcastingAbility = null) => {
    const full = spellIndex.get(norm(name));
    const spell = { ...(full || {}), name, level: Number(full?.level ?? fallbackLevel ?? 0) };
    const key = `${norm(name)}|${castLevel || spell.level}`;
    const row = { ...spell, sourceInfo: source, castLevel, ownerClassName, spellcastingAbility, locked };
    const existing = rows.get(key);
    rows.set(key, _mergeRow(existing, row, locked));
    if (locked) {
      lockedNames.add(name);
      lockedNames.add(norm(name));
    }
  };

  (C?.selectedCantrips || []).forEach((name) => pushKnown(name, 0, null, C?.className));
  Object.entries(C?.selectedSpells || {}).forEach(([level, names]) => {
    (names || []).forEach((name) => pushKnown(name, Number(level), null, C?.className));
  });
  (C?.extraClasses || []).forEach((ec) => {
    (ec.selectedCantrips || []).forEach((name) => pushKnown(name, 0, { label: ec.name || 'Class', color: '#9d7fb8' }, ec.name));
    Object.entries(ec.selectedSpells || {}).forEach(([level, names]) => {
      (names || []).forEach((name) => pushKnown(name, Number(level), { label: ec.name || 'Class', color: '#9d7fb8' }, ec.name));
    });
  });

  if (norm(C?.className) === 'wizard') pushWizardRitualBook(C, C.className);
  (C?.extraClasses || []).forEach((ec) => {
    if (norm(ec?.name) === 'wizard') pushWizardRitualBook(ec, ec.name);
  });

  collectAtWillSpells(C).forEach(({ name, source }) => push(name, source, true));
  collectAutoGrantedSpells(C).forEach(({ name, level, source, ownerClassName }) => push(name, source, true, null, level, ownerClassName));
  collectChoiceSpells(C, spellIndex).forEach(({ name, source, ownerClassName, spellcastingAbility }) => push(name, source, true, null, 0, ownerClassName, spellcastingAbility));

  const all = [...rows.values()];
  all.forEach((entry) => {
    Object.assign(entry, resolveSpellMeta(entry, C));
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
  return { cantrips, atWill, leveled, lockedNames, lockedEntries: all.filter((entry) => entry.locked || lockedNames.has(entry.name) || lockedNames.has(norm(entry.name))) };

  function pushKnown(name, level, source, ownerClassName) {
    const full = spellIndex.get(norm(name));
    if (full) push(name, source, false, null, 0, ownerClassName);
    else {
      const key = `${norm(name)}|${level}`;
      if (!rows.has(key)) rows.set(key, { name, level: Number(level || 0), sourceInfo: source, ownerClassName });
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
        push(name, { label: 'Ritual Book', color: '#58b879', kind: 'ritualBook' }, false, null, spellLevel, ownerClassName);
      });
    });
  }
}

const _MODIFIER_ONLY_CHOICE_KEY = /^warlock_(agonizing_blast|repelling_blast|eldritch_spear)_cantrip/;

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
  if (!slotKey) return null;
  const abilityKey = `${slotKey}_spell_ability`;
  const raw = C?.choices?.[abilityKey];
  const val = _choiceValue(raw);
  if (val) {
    const normalized = _normalizeAbility(val);
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
      if (norm.feats?.origin?.length) {
        const originFeat = String(norm.feats.origin[0]);
        if (originFeat) return originFeat;
      }
    } catch {}
  }

  const originFromChoices = C?.choices?.feat_origin;
  if (originFromChoices && typeof originFromChoices === 'string' && !originFromChoices.startsWith('feat_')) return originFromChoices;

  const snapshots = C?.allFeatSnapshots;
  if (Array.isArray(snapshots)) {
    for (const feat of snapshots) {
      if (feat?.name && typeof feat.name === 'string' && feat.additionalSpells) {
        return feat.name;
      }
    }
  }

  return _originFeatForBackground(C?.bgName);
}

/** Legacy fallback for old characters saved before origin_feat was persisted. */
function _originFeatForBackground(bgName) {
  if (!bgName || typeof bgName !== 'string') return null;
  const n = bgName.toLowerCase().replace(/[^a-z]/g, '');
  if (n === 'guide' || n === 'acolyte' || n === 'sage') return 'Magic Initiate';
  if (n === 'farmer') return 'Tough';
  if (n === 'sailor') return 'Skilled';
  if (n === 'wayfarer') return 'Musician';
  return null;
}

function _buildFeatMetaMap(C) {
  const map = new Map();
  const choices = C?.choices || {};
  Object.entries(choices).forEach(([key]) => {
    const slotKey = _extractChoiceSpellSlotKey(key);
    if (!slotKey || !_isFeatLikeSlotKey(C, slotKey)) return;
    if (map.has(slotKey)) return;
    let name = _findFeatName(C, slotKey);
    let ability = null;
    const abilityKey = `${slotKey}_spell_ability`;
    if (abilityKey in choices) {
      ability = _normalizeAbility(_choiceValue(choices[abilityKey]));
    }
    if (name) map.set(slotKey, { name, ability });
  });
  return map;
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

function collectChoiceSpells(C, spellIndex) {
  const featMetaMap = _buildFeatMetaMap(C);
  const out = [];
  Object.entries(C?.choices || {}).forEach(([key, value]) => {
    const cleanKey = key.replace(/^mc\d+_/, '');
    if (_MODIFIER_ONLY_CHOICE_KEY.test(cleanKey)) return;
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
      if (meta) {
        out.push({
          name,
          source: { label: meta.name, color: '#caa550', originType: 'feat', originLabel: meta.name },
          spellcastingAbility: meta.ability,
          ownerClassName,
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
  const runtimeOut = [];
  const entities = [{ className: C?.className, subclassShortName: C?.subclassShortName, level: C?.classLevel || C?.level || 1 }];
  (C?.extraClasses || []).forEach((ec) => entities.push({ className: ec.name, subclassShortName: ec.subclassShortName, level: ec.level || 1 }));
  entities.forEach((entity) => {
    const cfgs = [
      installedRegistry.getClassRuntimeConfig(entity.className),
      installedRegistry.getSubclassRuntimeConfig(entity.className, entity.subclassShortName),
    ];
    cfgs.forEach((cfg) => {
      [...(cfg?.spellcasting?.alwaysKnownSpells || []), ...(cfg?.spellcasting?.alwaysPreparedSpells || [])].forEach((spell) => {
        const name = typeof spell === 'string' ? spell : spell?.name;
        if (!name || entity.level < Number(spell?.minLevel || 1)) return;
        if (spell?.invocation && !warlockHasInvocation(C, spell.invocation)) return;
        const hasExplicitSource = !!spell?.source;
        const srcLabel = hasExplicitSource ? spell.source : (entity.subclassShortName ? `${entity.subclassShortName} Spells` : entity.className || 'Auto');
        const srcOriginType = hasExplicitSource ? 'auto_granted' : (entity.subclassShortName ? 'subclass' : 'class');
        const srcOriginLabel = hasExplicitSource ? spell.source : (entity.subclassShortName ? `${entity.subclassShortName} Spells` : entity.className || 'Auto');
        runtimeOut.push({ name, level: Number(spell?.level ?? 0), source: { label: srcLabel, color: '#70b7a6', originType: srcOriginType, originLabel: srcOriginLabel }, ownerClassName: entity.className });
      });
    });
  });

  const runtimeByName = new Map();
  runtimeOut.forEach((entry) => {
    const key = norm(entry.name);
    if (key) runtimeByName.set(key, entry);
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
    if (cfgEntry?.invocation && !warlockHasInvocation(C, cfgEntry.invocation)) return;
    runtimeByName.set(key, { name: entry.name, level: Number(entry.level ?? 0), source: { label: entry.source || 'Auto', color: '#70b7a6', originType: 'auto_granted', originLabel: entry.source || 'Auto' }, ownerClassName: ownerClass });
  });

  return [...runtimeByName.values()];
}

function collectAtWillSpells(C) {
  const out = [];
  const entities = [{ name: C?.className, level: C?.classLevel || C?.level || 1 }, ...(C?.extraClasses || []).map((ec) => ({ name: ec.name, level: ec.level || 1 }))];
  entities.forEach((entity) => {
    (installedRegistry.getClassAtWillSpells(entity.name) || []).forEach((entry) => {
      if (entity.level < Number(entry.minLevel || 1)) return;
      if (entry.invocation && !warlockHasInvocation(C, entry.invocation)) return;
      out.push({ name: entry.spell, source: { label: entry.invocation || 'At Will', color: '#9d7fb8', kind: 'atWill', originType: 'invocation', originLabel: entry.invocation || 'At Will' } });
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
  if (featName) return { label: String(featName), color: '#caa550', originType: 'feat', originLabel: String(featName) };
  if (key.startsWith('feat_')) return { label: 'Feat', color: '#caa550', originType: 'feat', originLabel: 'Feat' };
  if (key.startsWith('subclass_')) return { label: C?.subclassShortName || 'Subclass', color: '#9d7fb8', originType: 'subclass', originLabel: C?.subclassShortName || 'Subclass' };
  if (key.startsWith('species_')) return { label: C?.speciesName || 'Species', color: '#70b7a6', originType: 'species', originLabel: C?.speciesName || 'Species' };
  if (key.includes('tome')) return { label: 'Pact of the Tome', color: '#9d7fb8', originType: 'invocation', originLabel: 'Pact of the Tome' };
  if (key.includes('mystic_arcanum')) return { label: 'M. Arcanum', color: '#d69245', originType: 'mystic_arcanum', originLabel: 'Mystic Arcanum' };
  if (key.startsWith('warlock_')) {
    var invName = key.replace(/^warlock_/, '').replace(/_(cantrip|ritual).*$/, '').replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    if (invName) return { label: invName, color: '#9d7fb8', originType: 'invocation', originLabel: invName };
  }
  return { label: 'Choice', color: '#9d7fb8', originType: 'unknown', originLabel: 'Choice' };
}

function normalizeWizardBook(book) {
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

export function getResolvedCantripData(C, name) {
  if (!name) return null;
  const base = typeof installedRegistry.getCantripData === 'function'
    ? installedRegistry.getCantripData(name)
    : null;
  const modifiers = typeof installedRegistry.getCantripDataModifiers === 'function'
    ? (installedRegistry.getCantripDataModifiers(name) || [])
    : [];
  if (!base && !modifiers.length) return null;
  return modifiers.reduce((data, fn) => {
    if (typeof fn !== 'function') return data;
    try { return fn(data, C) || data; } catch { return data; }
  }, base ? { ...base } : {});
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function resolveDmgBonusValue(C, dmgBonus, getModFn, getFinalFn) {
  if (dmgBonus == null || dmgBonus === '' || dmgBonus === 0) return 0;
  if (typeof dmgBonus === 'number') return dmgBonus;
  if (typeof dmgBonus === 'function') {
    try { return Number(dmgBonus({ character: C }) || 0); } catch { return 0; }
  }
  const key = String(dmgBonus).toLowerCase();
  if (ABILITY_KEYS.includes(key) && typeof getModFn === 'function' && typeof getFinalFn === 'function') {
    return Number(getModFn(getFinalFn(C, key)) || 0);
  }
  const n = Number(dmgBonus);
  return Number.isFinite(n) ? n : 0;
}

function spellModifierEntities(C) {
  if (!C) return [];
  const out = [{ className: C.className, subclassShortName: C.subclassShortName, level: C.classLevel || C.level || 1 }];
  (C.extraClasses || []).forEach((ec) => out.push({ className: ec.name, subclassShortName: ec.subclassShortName, level: ec.level || 1 }));
  return out.filter((entry) => entry.className);
}

function normOwner(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const SCHOOL_ALIASES = {
  A: 'abjuration',
  C: 'conjuration',
  D: 'divination',
  E: 'enchantment',
  V: 'evocation',
  I: 'illusion',
  N: 'necromancy',
  T: 'transmutation',
};

function normalizeSpellSchool(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  return SCHOOL_ALIASES[upper] || raw.toLowerCase();
}

function schoolMatches(spellSchool, modifierSchool) {
  return normalizeSpellSchool(spellSchool) === normalizeSpellSchool(modifierSchool);
}

function collectSpellModifiers(C, ctx = {}) {
  const out = [];
  spellModifierEntities(C).forEach((entity) => {
    out.push(...((installedRegistry.getClassSheetSpellModifiers(entity.className) || []).map((mod) => ({
      mod,
      modifierOwnerType: 'class',
      ownerLevel: entity.level,
      ownerClassName: entity.className,
      ownerSubclassShortName: null,
    }))));
    out.push(...((installedRegistry.getSubclassSheetSpellModifiers(entity.className, entity.subclassShortName) || []).map((mod) => ({
      mod,
      modifierOwnerType: 'subclass',
      ownerLevel: entity.level,
      ownerClassName: entity.className,
      ownerSubclassShortName: entity.subclassShortName,
    }))));
  });
  if (C?.speciesName) {
    out.push(...((installedRegistry.getSpeciesSheetSpellModifiers(C.speciesName, C.speciesSource) || []).map((mod) => ({
      mod,
      modifierOwnerType: 'species',
      ownerLevel: C.level || 1,
      ownerClassName: null,
      ownerSubclassShortName: null,
    }))));
  }
  return out;
}

export function applySpellModifiers(C, ctx) {
  if (!ctx || !C) return ctx?.formula;
  const spellOwnerClass = ctx.ownerClassName || ctx.spell?.ownerClassName || null;
  const spellOwnerSubclass = ctx.ownerSubclassShortName || ctx.spell?.ownerSubclassShortName || null;
  let formula = ctx.formula;

  collectSpellModifiers(C, ctx).forEach(({ mod, modifierOwnerType, ownerLevel, ownerClassName, ownerSubclassShortName }) => {
    if (!mod) return;

    if (modifierOwnerType === 'class' && spellOwnerClass && normOwner(ownerClassName) !== normOwner(spellOwnerClass)) return;
    if (
      modifierOwnerType === 'subclass' &&
      spellOwnerClass &&
      (normOwner(ownerClassName) !== normOwner(spellOwnerClass) || (spellOwnerSubclass && normOwner(ownerSubclassShortName) !== normOwner(spellOwnerSubclass)))
    ) return;

    const modifierContext = {
      ...ctx,
      formula,
      character: C,
      choices: C?.choices || {},
      ownerLevel,
      ownerClassName,
      ownerSubclassShortName,
    };

    if (typeof mod === 'function') {
      try {
        const next = mod(modifierContext);
        if (typeof next === 'string' && next) formula = next;
      } catch {}
      return;
    }
    if (typeof mod === 'object') {
      if (mod.minLevel && Number(ownerLevel || 1) < Number(mod.minLevel)) return;
      if (mod.kind && mod.kind !== ctx.kind) return;
      if (mod.school && !schoolMatches(ctx?.spell?.school, mod.school)) return;
      if (mod.minSpellLevel != null && Number(ctx?.level ?? ctx?.castLevel ?? 0) < Number(mod.minSpellLevel)) return;
      if (typeof mod.condition === 'function' && !mod.condition(modifierContext)) return;
      let amount = 0;
      if (typeof mod.amount === 'function') amount = Number(mod.amount(modifierContext) || 0);
      else if (typeof mod.amount === 'string') amount = resolveDmgBonusValue(C, mod.amount, getAbilityMod, getFinalScore);
      else amount = Number(mod.amount || 0);
      if (!amount) return;
      formula = applyFlatBonus(formula, amount);
    }
  });
  return formula;
}

function applyFlatBonus(formula, amount) {
  if (!formula) return formula;
  const text = String(formula).replace(/\s+/g, '');
  const match = text.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return formula;
  const count = Number(match[1]);
  const faces = Number(match[2]);
  const flat = Number(match[3] || 0) + amount;
  return `${count}d${faces}${flat ? (flat > 0 ? '+' : '') + flat : ''}`;
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

export function getSpellLimits(C) {
  const totals = getSpellEntities(C).reduce((sum, entity) => {
    const level = clampLevel(entity.level);
    const profile = getSpellcastingProfile(entity);
    if (!hasSpellcastingProfile(profile)) return sum;
    const { cantrips, spells } = getClassSpellLimits(profile, level);
    return {
      cantrips: addLimit(sum.cantrips, cantrips),
      spells: addLimit(sum.spells, spells),
    };
  }, { cantrips: null, spells: null });
  return totals;
}

export function getSheetSlots(C) {
  const entities = getSpellEntities(C);
  const casterEntities = entities
    .map((entity) => ({ ...entity, profile: getSpellcastingProfile(entity) }))
    .filter((entity) => hasSpellcastingProfile(entity.profile));
  if (!casterEntities.length) return { regular: [], pact: null };

  const pactEntity = casterEntities.find((entity) => normalizeProgression(entity.profile.casterProgression) === 'pact');
  const pact = pactEntity ? pactSlots(clampLevel(pactEntity.level)) : null;

  const regularEntities = casterEntities.filter((entity) => normalizeProgression(entity.profile.casterProgression) !== 'pact');
  if (!regularEntities.length) return { regular: [], pact };

  if (casterEntities.length === 1 && !pactEntity) {
    const entity = regularEntities[0];
    const level = clampLevel(entity.level);
    const prog = normalizeProgression(entity.profile.casterProgression);
    if (prog === 'full') return { regular: FULL_SLOTS[level] || [], pact };
    if (prog === 'half') return { regular: HALF_SLOTS[level] || [], pact };
    if (prog === 'third') return { regular: THIRD_SLOTS[level] || [], pact };
    if (prog === 'artificer') return { regular: HALF_SLOTS[level] || [], pact };
  }

  const casterLevel = regularEntities.reduce((sum, entity) => (
    sum + casterContribution(normalizeProgression(entity.profile.casterProgression), clampLevel(entity.level))
  ), 0);
  return { regular: casterLevel > 0 ? FULL_SLOTS[Math.min(20, casterLevel)] || [] : [], pact };
}

function getMaxCastableSpellLevel(slots) {
  const regularMax = (slots?.regular || []).reduce((max, count, index) => (count ? index + 1 : max), 0);
  return Math.max(regularMax, Number(slots?.pact?.level || 0));
}

export function getMaxLearnableSpellLevel(C) {
  return getSpellEntities(C).reduce((max, entity) => {
    const profile = getSpellcastingProfile(entity);
    const level = clampLevel(entity.level);
    const prog = normalizeProgression(profile.casterProgression);
    if (prog === 'pact') return Math.max(max, Number(pactSlots(level).level || 0));
    if (prog === 'full') return Math.max(max, getMaxCastableSpellLevel({ regular: FULL_SLOTS[level] || [] }));
    if (prog === 'half') return Math.max(max, getMaxCastableSpellLevel({ regular: HALF_SLOTS[level] || [] }));
    if (prog === 'third') return Math.max(max, getMaxCastableSpellLevel({ regular: THIRD_SLOTS[level] || [] }));
    if (prog === 'artificer') return Math.max(max, getMaxCastableSpellLevel({ regular: HALF_SLOTS[level] || [] }));
    return max;
  }, 0);
}

export function canManageSpells(C, limits) {
  if (!C) return false;
  if ((limits.cantrips || 0) > 0 || (limits.spells || 0) > 0) return true;
  if ((C.selectedCantrips || []).length || Object.values(C.selectedSpells || {}).flat().length) return true;
  return getSpellEntities(C).some((entity) => hasSpellcastingProfile(getSpellcastingProfile(entity)));
}

export function getSpellEntities(C) {
  if (!C) return [];
  return [
    {
      className: C.className,
      subclassShortName: C.subclassShortName,
      level: C.classLevel || C.level || 1,
      snapshot: C.clsSnapshot,
    },
    ...(C.extraClasses || []).map((extra) => ({
      className: extra.name,
      subclassShortName: extra.subclassShortName,
      level: extra.level || 1,
      snapshot: extra.clsSnapshot || extra.cls,
    })),
  ].filter((entity) => entity.className);
}

export function getSpellcastingProfile(entity) {
  const classCfg = installedRegistry.getClassRuntimeConfig(entity.className)?.spellcasting || {};
  const subCfg = installedRegistry.getSubclassRuntimeConfig(entity.className, entity.subclassShortName)?.spellcasting || {};
  return {
    ...classCfg,
    ...subCfg,
    casterProgression: subCfg.casterProgression || classCfg.casterProgression || entity.snapshot?.casterProgression,
    cantripProgression: entity.snapshot?.cantripProgression,
    preparedSpellsProgression: subCfg.preparedSpellsProgression || classCfg.preparedSpellsProgression || entity.snapshot?.preparedSpellsProgression,
    alwaysKnownSpells: [
      ...(classCfg.alwaysKnownSpells || []),
      ...(subCfg.alwaysKnownSpells || []),
    ],
    alwaysPreparedSpells: [
      ...(classCfg.alwaysPreparedSpells || []),
      ...(subCfg.alwaysPreparedSpells || []),
    ],
  };
}

export function hasSpellcastingProfile(profile) {
  return Boolean(
    normalizeProgression(profile?.casterProgression)
    || profile?.cantripKnown
    || profile?.cantripProgression
    || profile?.spellsKnown
    || profile?.preparedSpellsProgression
    || profile?.alwaysKnownSpells?.length
    || profile?.alwaysPreparedSpells?.length
  );
}

function addLimit(a, b) {
  if (b == null) return a;
  return Number(a || 0) + Number(b || 0);
}

function clampLevel(level) {
  return Math.max(1, Math.min(20, Number(level || 1)));
}

function casterContribution(prog, level) {
  if (prog === 'full') return level;
  if (prog === 'half') return Math.floor(level / 2);
  if (prog === 'artificer') return Math.ceil(level / 2);
  if (prog === 'third') return Math.floor(level / 3);
  return 0;
}

function pactSlots(level) {
  const row = PACT_SLOTS[Math.min(level, 20)] || {};
  return { count: row.slots || row.n || 0, level: row.level || row.l || 1 };
}

export function normalizeProgression(value) {
  const v = String(value || '').toLowerCase();
  if (v === '1/2') return 'half';
  if (v === '1/3') return 'third';
  return v;
}

export function getMaxLearnableSpellLevelForEntity(entity) {
  const profile = getSpellcastingProfile(entity);
  const level = clampLevel(entity?.level);
  const prog = normalizeProgression(profile.casterProgression);
  if (prog === 'pact') return Math.max(0, Number(pactSlots(level).level || 0));
  if (prog === 'full') return getMaxCastableSpellLevel({ regular: FULL_SLOTS[level] || [] });
  if (prog === 'half') return getMaxCastableSpellLevel({ regular: HALF_SLOTS[level] || [] });
  if (prog === 'third') return getMaxCastableSpellLevel({ regular: THIRD_SLOTS[level] || [] });
  if (prog === 'artificer') return getMaxCastableSpellLevel({ regular: HALF_SLOTS[level] || [] });
  return 0;
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
    else if (src.color === '#caa550') { originType = 'feat'; originLabel = label || 'Feat'; }
    else if (src.color === '#70b7a6') { originType = 'auto_granted'; originLabel = label || 'Auto'; }
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
  ritual_spellbook: { label: 'Ritual Book', color: '#58b879' },
  at_will: { label: 'At Will', color: '#9d7fb8' },
  mystic_arcanum: { label: 'M. Arcanum', color: '#d69245' },
  always_prepared: { label: 'Always Prep.', color: '#70b7a6' },
  granted: { label: 'Granted', color: '#70b7a6' },
  known: { label: 'Known', color: '#58b879' },
};

export function getSpellStatusChips(entry) {
  const chips = [];
  const state = entry.preparationState;
  if (!state || !_STATUS_CHIP_CONFIG[state]) return chips;
  if (entry.sourceInfo?.kind === 'ritualBook') return chips;
  if (entry.sourceInfo?.kind === 'atWill') return chips;
  if (entry.originType === 'feat' && state === 'granted') return chips;
  const cfg = _STATUS_CHIP_CONFIG[state];
  chips.push({ key: state, label: cfg.label, color: cfg.color, bg: `${cfg.color}1a` });
  return chips;
}

export function getCastBadge(spell) {
  const unit = spell?.time?.[0]?.unit || '';
  if (unit === 'bonus') return { label: 'BA', color: '#f5c542' };
  if (unit === 'reaction') return { label: 'RE', color: '#f5a623' };
  if (unit === 'action' || unit === '') return { label: 'A', color: '#4d95d6' };
  return { label: unit, color: '#c4b393' };
}

export function getMetaLine(spell) {
  const time = spell?.castingTimeLabel || spell?.castingTime || (spell?.time?.[0] ? `${spell.time[0].number || 1} ${spell.time[0].unit}` : '');
  const range = spell?.rangeLabel || spell?.rangeText || formatSpellField(spell?.range);
  const componentsBase = spell?.componentsLabel || formatComponents(spell?.components);
  const material = spell?.materialLabel || formatMaterial(spell?.components?.m);
  const components = componentsBase && material ? `${componentsBase} (${material})` : componentsBase;
  const duration = spell?.durationLabel || spell?.durationText || formatSpellField(spell?.duration);
  return [time, range, components, duration].filter(Boolean).join(' - ');
}

function formatComponents(components) {
  if (!components || typeof components !== 'object') return '';
  return [components.v ? 'V' : null, components.s ? 'S' : null, components.m ? 'M' : null].filter(Boolean).join(', ');
}

function formatMaterial(material) {
  if (!material) return '';
  if (typeof material === 'string') return material;
  if (typeof material === 'object') return material.text || material.name || '';
  return '';
}

function formatSpellField(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(formatSpellField).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    if (value.type && value.amount) return `${value.amount} ${value.type}`;
    if (value.distance) return formatSpellField(value.distance);
    if (value.unit && value.number) return `${value.number} ${value.unit}`;
    if (value.type) return String(value.type);
  }
  return '';
}

export function renderEntries(entries) {
  return renderSafeEntries(entries);
}

export { entriesToPlainText, entriesToTextBlocks };

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

function parseDice(formula) {
  const match = String(formula).match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
  if (!match) return null;
  return { count: parseInt(match[1]), faces: parseInt(match[2]), mod: match[3] ? parseInt(match[3]) : 0 };
}

function formatDice(count, faces, mod) {
  let s = `${count}d${faces}`;
  if (mod) s += `${mod > 0 ? '+' : ''}${mod}`;
  return s;
}

export function computeScaledFormula(baseFormula, stepFormula, steps) {
  const b = parseDice(baseFormula);
  const s = parseDice(stepFormula);
  if (!b || !s) return baseFormula;
  return formatDice(b.count + s.count * steps, b.faces, b.mod);
}

export function getUpcastStep(entries) {
  if (!entries) return null;
  const text = JSON.stringify(entries);
  const m = text.match(/\{@scaled(?:amage|ice)\s+(\d+d\d+)\|(\d+-\d+)\|(\d+d\d+)\}/);
  if (m) return { stepDie: m[3], range: m[2], display: m[1] };
  const m2 = text.match(/\{@scaled(?:amage|ice)\s+(\d+d\d+)\|(\d+-\d+)\}/);
  if (m2) return { stepDie: m2[1], range: m2[2], display: m2[1] };
  return null;
}

export function extractDamageDice(entries) {
  const out = [];
  const seen = new Set();
  const walk = (node) => {
    if (!node) return;
    if (typeof node === 'string') {
      node.replace(/\{@damage ([^}]+)\}/g, (_, inner) => {
        const formula = inner.trim().replace(/\s+/g, '');
        if (!seen.has(formula)) { seen.add(formula); out.push({ formula, label: formula }); }
        return '';
      });
      return;
    }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  };
  walk(entries);
  return out;
}

export function formatBonus(value) {
  return value >= 0 ? `+${value}` : String(value);
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
