import { getMod, getFinal, getPB } from './calculations.js';
import { installedRegistry } from '../../../adapters/index.js';
import { hasActionRequirement } from '../../../shared/character/choiceUtils.js';
import { getWeaponProficiencyInfo, hasNonProficientArmor } from './proficiencies.js';
import {
  collectResolvedWeaponMasteries,
  findWeaponItemByName,
  getWeaponMasteryEntries,
  normalizeWeaponName,
  resolveWeaponMasteryForItem,
} from '../../../shared/character/weaponMastery.js';
import {
  itemProps,
  getWeaponDamageDice,
  canUseLightExtraAttack,
  getOffHandDamageMod,
  hasTwoWeaponFightingStyle,
} from './equipmentSlots.js';
import { weaponEnhancement } from '../../../shared/character/itemBonus.js';

export const FILTERS = ['all', 'action', 'bonus', 'reaction'];
export const CAT_COLORS = { attack: '#de675f', action: '#caa550', bonus: '#70b7a6', reaction: '#9d7fb8' };
const EXECUTABLE_CATS = new Set(['attack', 'action', 'bonus', 'reaction']);
export const SECTION_DEFS = [
  { key: 'action', title: 'Actions', cats: ['action', 'attack'] },
  { key: 'bonus', title: 'Bonus Actions', cats: ['bonus'] },
  { key: 'reaction', title: 'Reactions', cats: ['reaction'] },
];

export const TAG_PRESETS = {
  mastery:    { color: '#edd48a', borderColor: 'rgba(237,212,138,0.55)', bgColor: 'rgba(237,212,138,0.12)' },
  noprof:     { color: '#de675f', borderColor: '#de675f',               bgColor: 'rgba(222,103,95,0.14)' },
  dis:        { color: '#d69245', borderColor: '#d69245',               bgColor: 'rgba(213,138,61,0.14)' },
  slot:       { color: '#58b879', borderColor: 'rgba(88,184,121,0.55)', bgColor: 'rgba(88,184,121,0.12)' },
  inlinePill: { color: '#edd48a', borderColor: 'rgba(237,212,138,0.4)', bgColor: 'rgba(237,212,138,0.12)' },
};

export function buildActionTags(action, C) {
  const tags = [];
  const ownerLevel = action.ownerLevel ?? C?.classLevel ?? C?.level ?? 1;

  if (action._weaponMastery) {
    tags.push({ key: 'mastery', label: action._weaponMastery, ...TAG_PRESETS.mastery });
  }
  if (action._notProficient) {
    tags.push({ key: 'noprof', label: 'NO PROF', ...TAG_PRESETS.noprof });
  }
  if (action._disadvantage) {
    tags.push({ key: 'dis', label: 'DIS', ...TAG_PRESETS.dis });
  }
  if (action._weaponSlot) {
    tags.push({ key: 'slot', label: action._weaponSlot, ...TAG_PRESETS.slot });
  }

  const pills = typeof action.inlinePills === 'function'
    ? action.inlinePills({ character: C, ownerLevel })
    : (Array.isArray(action.inlinePills) ? action.inlinePills : []);
  pills.forEach((pill, idx) => {
    const label = `${pill.label || ''}${pill.value != null ? ` ${pill.value}` : ''}`.trim();
    if (label) {
      tags.push({ key: `pill-${idx}`, label, ...TAG_PRESETS.inlinePill });
    }
  });

  return { ...action, tags };
}

function resourceOwnerLevel(def, C) {
  return Number(def?.ownerLevel ?? C?.classLevel ?? C?.level ?? 1);
}

function resourceAbilityMods(C) {
  return {
    str: getMod(getFinal(C, 'str')),
    dex: getMod(getFinal(C, 'dex')),
    con: getMod(getFinal(C, 'con')),
    int: getMod(getFinal(C, 'int')),
    wis: getMod(getFinal(C, 'wis')),
    cha: getMod(getFinal(C, 'cha')),
  };
}

export function normalizeResourceMax(def, C = null) {
  const raw = def?.max ?? 1;
  if (typeof raw === 'function') {
    try {
      const value = raw(resourceOwnerLevel(def, C), resourceAbilityMods(C), { character: C, resource: def });
      const n = Number(value);
      if (!Number.isFinite(n)) return value === Infinity ? Infinity : 1;
      return Math.max(0, Math.floor(n));
    } catch {
      return 1;
    }
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw === Infinity ? Infinity : 1;
  return Math.max(0, Math.floor(n));
}

function hasCondition(def, C, sheet) {
  if (typeof def?.condition !== 'function' && !def?.requiresChoice && !(def?.choiceKey && def?.model) && !def?.requiresInventoryFlag) return true;
  try { return hasActionRequirement(def, C, sheet); } catch { return false; }
}

function getClassEntities(C) {
  if (!C) return [];
  const out = [];
  if (C.className) {
    out.push({
      className: C.className,
      subclassShortName: C.subclassShortName || '',
      level: Number(C.classLevel || C.level || 1),
      ownerName: C.className,
    });
  }
  (C.extraClasses || []).forEach((extra) => {
    if (!extra?.name) return;
    out.push({
      className: extra.name,
      subclassShortName: extra.subclassShortName || '',
      level: Number(extra.level || 1),
      ownerName: extra.name,
    });
  });
  return out;
}

function selectedFeatNames(C) {
  return (C?.allFeatSnapshots || []).map((feat) => feat?.name).filter(Boolean);
}

function normActionKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function actionDedupeKey(item) {
  return [
    normActionKey(item.name || item.key || ''),
    normActionKey(item.resKey || ''),
    normActionKey(item.cat || ''),
    String(item.minLevel || ''),
  ].join('|');
}

function actionSpecificityScore(item) {
  let score = 0;
  if (!item?._runtimeFallback) score += 100;
  if (item?.desc) score += 10;
  if (item?.damageFormula || item?.healFormula || item?.attackBonus != null) score += 5;
  if (item?.ownerName && !/^(runtime|feat)$/i.test(String(item.ownerName))) score += 1;
  return score;
}

function uniqBySignature(items) {
  const byKey = new Map();

  items.forEach((item) => {
    const key = actionDedupeKey(item);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, item);
      return;
    }

    // Prefer live registry data over serialized adapterRuntime fallback.
    if (actionSpecificityScore(item) > actionSpecificityScore(existing)) {
      byKey.set(key, item);
    }
  });

  return [...byKey.values()];
}

function isExecutableAction(action) {
  const cat = String(action?.cat || '').toLowerCase();
  if (!EXECUTABLE_CATS.has(cat)) return false;
  if (action.passive) return false;
  return true;
}

export function resolveActionFormulas(action, C) {
  if (!action) return action;
  const ownerLv = action.ownerLevel ?? C?.classLevel ?? C?.level ?? 1;
  const ctx = { character: C, ownerLevel: ownerLv };
  const patch = {};

  if (typeof action.healFormula === 'function') patch.healFormula = action.healFormula(ctx);
  if (typeof action.damageFormula === 'function') patch.damageFormula = action.damageFormula(ctx);
  if (typeof action.damageButtonLabel === 'function') patch.damageButtonLabel = action.damageButtonLabel(ctx);
  if (typeof action.attackBonus === 'function') {
    const resolved = action.attackBonus(ctx);
    if (Number.isFinite(resolved)) patch.attackBonus = resolved;
  }
  if (Object.keys(patch).length) return { ...action, ...patch };

  return action;
}

// Normalize feature names so lookups survive minor adapter/data drift:
//   "Action Surge (One Use)" → "actionsurge"
//   "Maneuvers: Trip Attack" → "maneuverstripattack" (full) + "tripattack" (tail)
function nameKey(value) {
  return String(value || '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '').trim();
}

function nameKeyCandidates(value) {
  const raw = String(value || '');
  const candidates = new Set();
  const full = nameKey(raw);
  if (full) candidates.add(full);
  const colonParts = raw.split(':').map((s) => s.trim()).filter(Boolean);
  if (colonParts.length > 1) {
    colonParts.forEach((part) => {
      const key = nameKey(part);
      if (key) candidates.add(key);
    });
  }
  return Array.from(candidates);
}

const _featureKeyConflicts = typeof Set === 'function' ? new Set() : null;
function reportKeyConflict(scope, key, existingName, incomingName) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
  if (!_featureKeyConflicts) return;
  const cacheKey = `${scope}|${key}`;
  if (_featureKeyConflicts.has(cacheKey)) return;
  _featureKeyConflicts.add(cacheKey);
  // eslint-disable-next-line no-console
  console.warn(`[actions] Feature-name collision in ${scope}: "${existingName}" and "${incomingName}" both normalize to "${key}". Keeping first.`);
}

function collectNamedEntries(entries, scope) {
  const map = new Map();
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node !== 'object') return;
    if (node.name && Array.isArray(node.entries)) {
      const key = nameKey(node.name);
      if (key) {
        const existing = map.get(key);
        if (!existing) {
          map.set(key, Object.assign(node.entries.slice(), { _name: node.name }));
        } else if (existing._name !== node.name) {
          reportKeyConflict(scope, key, existing._name, node.name);
        }
      }
    }
    if (Array.isArray(node.entries)) walk(node.entries);
    if (Array.isArray(node.items)) walk(node.items);
  };
  walk(entries);
  return map;
}

function buildFeatureMapFromRecords(records, scope) {
  const map = new Map();
  const indexNamedNode = (node) => {
    if (!node || typeof node !== 'object') return;
    const entriesArr = Array.isArray(node.entries)
      ? node.entries
      : (Array.isArray(node.items) ? node.items : null);
    if (node.name && entriesArr) {
      const key = nameKey(node.name);
      if (key) {
        const existing = map.get(key);
        if (!existing) {
          map.set(key, Object.assign(entriesArr.slice(), { _name: node.name }));
        } else if (existing._name !== node.name) {
          reportKeyConflict(scope, key, existing._name, node.name);
        }
      }
    }
    if (Array.isArray(node.entries)) node.entries.forEach(indexNamedNode);
    if (Array.isArray(node.items)) node.items.forEach(indexNamedNode);
  };
  (records || []).forEach((feature) => {
    if (!feature?.name || !Array.isArray(feature.entries)) return;
    indexNamedNode(feature);
  });
  return map;
}

const _missingDescWarned = typeof Set === 'function' ? new Set() : null;
function warnMissingDescription(action, source) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
  if (!_missingDescWarned) return;
  const key = `${source || ''}|${action?.name || ''}`;
  if (_missingDescWarned.has(key)) return;
  _missingDescWarned.add(key);
  // eslint-disable-next-line no-console
  console.warn(`[actions] No description for "${action?.name}" (source: ${source || 'unknown'}). Add a matching 5etools feature entry or set descOverride.`);
}

/**
 * Action card descriptions come solely from `action.entries`, auto-resolved
 * from character snapshots (XPHB / XDMG / EFA / FRAiF / FRHoF) via the
 * feature-name maps built below.
 *
 * Adapter-side `desc` / `descOverride` fields are no longer rendered. When the
 * snapshot lookup fails (and the action isn't flagged `noDescription`), a
 * dev-mode warning is emitted so the missing feature mapping can be fixed.
 */
export function collectAdapterActions(C, sheet) {
  const out = [];
  const featSnapshotByName = new Map();
  (C?.allFeatSnapshots || []).forEach((feat) => {
    if (!feat?.name) return;
    const key = nameKey(feat.name);
    if (!key) return;
    const existing = featSnapshotByName.get(key);
    if (!existing) featSnapshotByName.set(key, feat);
    else if (existing.name !== feat.name) reportKeyConflict('feats', key, existing.name, feat.name);
  });
  const classFeatureByName = buildFeatureMapFromRecords(C?.allClassFeatures, 'class features');
  const subclassFeatureByName = buildFeatureMapFromRecords(C?.allSubFeatures, 'subclass features');
  const extraFeatureMaps = (C?.extraClasses || []).flatMap((extra, idx) => [
    buildFeatureMapFromRecords(extra?.allClassFeatures, `extra class features [${idx}]`),
    buildFeatureMapFromRecords(extra?.allSubFeatures, `extra subclass features [${idx}]`),
  ]);
  const speciesFeatureByName = collectNamedEntries(C?.speciesSnapshot?.entries || [], 'species features');
  const backgroundFeatureByName = collectNamedEntries(C?.backgroundSnapshot?.entries || [], 'background features');

  const lookupByName = (key) => {
    if (!key) return null;
    if (classFeatureByName.has(key)) return classFeatureByName.get(key);
    if (subclassFeatureByName.has(key)) return subclassFeatureByName.get(key);
    for (const map of extraFeatureMaps) if (map.has(key)) return map.get(key);
    if (speciesFeatureByName.has(key)) return speciesFeatureByName.get(key);
    if (backgroundFeatureByName.has(key)) return backgroundFeatureByName.get(key);
    return null;
  };

  const resolveOfficialEntries = (action, source) => {
    if (action.entries) return action.entries;
    const ownerCandidates = nameKeyCandidates(action.ownerName || source);
    for (const candidate of ownerCandidates) {
      const feat = featSnapshotByName.get(candidate);
      if (feat?.entries) return feat.entries;
    }
    const actionCandidates = nameKeyCandidates(action.name);
    for (const candidate of actionCandidates) {
      const entries = lookupByName(candidate);
      if (entries) return entries;
    }
    return null;
  };

  const pushFiltered = (arr, source, ownerLevel = C?.level ?? 1) => {
    (arr || []).forEach(a => {
      if (!a || !a.name) return;
      const lv = Number(a.ownerLevel ?? ownerLevel ?? C?.level ?? 1);
      if (a.minLevel && lv < Number(a.minLevel)) return;
      if (!hasCondition(a, C, sheet)) return;
      if (!isExecutableAction(a)) return;
      const officialEntries = resolveOfficialEntries(a, source);
      if (!officialEntries && !a.noDescription) {
        warnMissingDescription(a, source);
      }
      const { desc: _legacyDesc, descOverride: _legacyOverride, ...rest } = a;
      out.push({
        ...rest,
        ownerLevel: lv,
        ownerName: a.ownerName || source,
        _source: a.ownerName || source,
        entries: officialEntries || null,
      });
    });
  };

  // Prefer live registry data so function properties such as condition/max/formula survive
  // after the character has been serialized to localStorage.
  getClassEntities(C).forEach((entity) => {
    pushFiltered(installedRegistry.getClassSheetActions(entity.className), entity.ownerName, entity.level);
    if (entity.subclassShortName) {
      pushFiltered(
        installedRegistry.getSubclassSheetActions(entity.className, entity.subclassShortName),
        `${entity.subclassShortName} (${entity.className})`,
        entity.level,
      );
    }
  });
  if (C?.speciesName) {
    pushFiltered(installedRegistry.getSpeciesSheetActions(C.speciesName, C.speciesSource), C.speciesName, C.level || 1);
  }
  selectedFeatNames(C).forEach((featName) => {
    pushFiltered(installedRegistry.getFeatSheetActions(featName), featName, C.level || 1);
  });

  // Fallback for older exported characters that already contain adapterRuntime.
  // Serialized adapterRuntime loses function properties such as `condition`, so use it
  // only if the live registry produced nothing.
  if (!out.length) {
    const runtime = C?.adapterRuntime || {};
    pushFiltered((runtime.classActions || []).map((a) => ({ ...a, _runtimeFallback: true })), C?.className || '', C?.classLevel || C?.level || 1);
    pushFiltered((runtime.subclassActions || []).map((a) => ({ ...a, _runtimeFallback: true })), C?.subclassShortName ? `${C.subclassShortName} (${C.className})` : '', C?.classLevel || C?.level || 1);
    pushFiltered((runtime.speciesActions || []).map((a) => ({ ...a, _runtimeFallback: true })), C?.speciesName || '', C?.level || 1);
    pushFiltered((runtime.featActions || []).map((a) => ({ ...a, _runtimeFallback: true })), 'Feat', C?.level || 1);
  }

  return uniqBySignature(out);
}


function classLevel(C, className) {
  if (String(C?.className || '').toLowerCase() === String(className).toLowerCase()) return Number(C?.classLevel || C?.level || 1);
  const extra = (C?.extraClasses || []).find(ec => String(ec?.name || '').toLowerCase() === String(className).toLowerCase());
  return Number(extra?.level || 0);
}

function hasFeat(C, name) {
  return (C?.allFeatSnapshots || []).some(f => String(f?.name || '').toLowerCase() === String(name).toLowerCase());
}

function weaponAbility(C, item, weaponOverride) {
  if (weaponOverride?.ability) return weaponOverride.ability;
  const type = String(item?.type || '').toUpperCase();
  const overrides = installedRegistry.getWeaponAbilityOverrides();
  for (const o of overrides) {
    if (o.weaponTypes && !o.weaponTypes.includes(type)) continue;
    if (o.itemFlag && !(item?.flags || []).includes(o.itemFlag)) continue;
    if (typeof o.condition === 'function' && !o.condition(C)) continue;
    return o.ability;
  }
  const props = itemProps(item);
  const finesse = props.includes('f') || props.includes('fin') || props.includes('finesse');
  if (type === 'R') return 'dex';
  if (finesse) return getMod(getFinal(C, 'dex')) > getMod(getFinal(C, 'str')) ? 'dex' : 'str';
  return 'str';
}

function weaponDamageBase(item) {
  return item?.damage?.[0]?.damage || item?.dmg1 || item?.damageDice || item?.dmg || '';
}

function weaponDamageType(item) {
  return item?.damage?.[0]?.type || item?.dmgType || '';
}

function makeWeaponAction(C, item, index, overrides, selectedMasteriesByWeapon, inventory, items, ctx = {}, opts = {}) {
  const { profSets, untrainedArmor } = ctx;
  const weaponOverride = overrides.find(o => {
    const type = String(item?.type || '').toUpperCase();
    if (o.weaponTypes && !o.weaponTypes.includes(type)) return false;
    if (o.itemFlag && !(item?.flags || []).includes(o.itemFlag)) return false;
    if (typeof o.condition === 'function' && !o.condition(C)) return false;
    return true;
  });
  const profInfo = getWeaponProficiencyInfo(C, item, weaponOverride, profSets);
  const ability = weaponAbility(C, item, weaponOverride);
  const overrideBlocked = weaponOverride?.requiresProficiency && !profInfo.proficient;
  const finalAbility = overrideBlocked ? (() => {
    const props = itemProps(item);
    const finesse = props.includes('f') || props.includes('fin') || props.includes('finesse');
    const type = String(item?.type || '').toUpperCase();
    if (type === 'R') return 'dex';
    if (finesse) return getMod(getFinal(C, 'dex')) > getMod(getFinal(C, 'str')) ? 'dex' : 'str';
    return 'str';
  })() : ability;
  const mod = getMod(getFinal(C, finalAbility));
  const enhancement = weaponEnhancement(item);
  const base = opts.damageBase != null ? opts.damageBase : weaponDamageBase(item);
  const finalMod = (opts.damageMod != null ? opts.damageMod : mod) + enhancement.damage;
  const damageFormula = base ? base + (finalMod !== 0 ? (finalMod >= 0 ? '+' : '') + finalMod : '') : '';
  const dtype = weaponDamageType(item);
  // XPHB 2024 Heavy weapon: Disadvantage on attack rolls if both STR and DEX < 13.
  const props = itemProps(item);
  const isHeavyWeapon = props.includes('h') || props.includes('heavy');
  const heavyUnderStat = isHeavyWeapon && getFinal(C, 'str') < 13 && getFinal(C, 'dex') < 13;
  const disAdv = (untrainedArmor && (finalAbility === 'str' || finalAbility === 'dex')) || heavyUnderStat;
  const selectedEntry = selectedMasteriesByWeapon.get(normalizeWeaponName(item?.name || '')) || null;
  const directMastery = selectedEntry ? resolveWeaponMasteryForItem(item) : null;
  const dbItem = selectedEntry && !directMastery
    ? findWeaponItemByName(items, item?.name || '', item?.source || '')
    : null;
  const mastery = selectedEntry
    ? (selectedEntry.mastery || directMastery || resolveWeaponMasteryForItem(dbItem))
    : null;
  return {
    name: opts.name || item.name || 'Weapon',
    cat: opts.cat || 'action',
    uses: opts.uses || 'Equipped',
    _source: 'Weapon',
    attackBonus: (profInfo.proficient ? getPB(C) + mod : mod) + enhancement.attack,
    damageFormula,
    damageButtonLabel: damageFormula ? `Damage ${damageFormula}${dtype ? ` ${dtype}` : ''}` : 'Damage',
    rollLabelPrefix: opts.rollLabelPrefix || item.name || 'Weapon',
    noDescription: true,
    _item: item,
    _enhancement: enhancement.attack || enhancement.damage ? enhancement : null,
    _weaponIndex: index,
    _weaponMastery: mastery || null,
    _weaponMasteryEntries: mastery ? getWeaponMasteryEntries(mastery) : null,
    _weaponSlot: item.equippedSlot || null,
    _colorBarCat: 'attack',
    _notProficient: !profInfo.proficient,
    _disadvantage: disAdv,
  };
}

export function makeWeaponActions(C, attacks, inventory, items = [], equipmentSets) {
  if (!equipmentSets) {
    throw new Error('makeWeaponActions requires equipmentSets from collectEquipmentProficiencySets(character)');
  }
  const overrides = installedRegistry.getWeaponAbilityOverrides();
  const selectedMasteriesByWeapon = new Map(
    collectResolvedWeaponMasteries(C, items)
      .map((entry) => [normalizeWeaponName(entry.weaponName), entry])
      .filter(([name]) => !!name),
  );

  const untrainedArmor = hasNonProficientArmor(C, inventory, equipmentSets);
  const ctx = { profSets: equipmentSets, untrainedArmor };

  const weaponActions = [];
  const hasTWF = hasTwoWeaponFightingStyle(C);
  const offHandItem = attacks.find(i => i.equippedSlot === 'offHand');
  const canLightExtra = offHandItem && canUseLightExtraAttack(C, inventory);

  attacks.forEach((item) => {
    if (item.equippedSlot === 'offHand' && canLightExtra) return;
    const base = getWeaponDamageDice(item, item.equippedSlot);
    weaponActions.push(makeWeaponAction(C, item, attacks.indexOf(item), overrides, selectedMasteriesByWeapon, inventory, items, ctx, { damageBase: base }));
  });

  if (canLightExtra && offHandItem) {
    const ohIndex = attacks.indexOf(offHandItem);
    const ohOverride = overrides.find(o => {
      const type = String(offHandItem?.type || '').toUpperCase();
      if (o.weaponTypes && !o.weaponTypes.includes(type)) return false;
      if (o.itemFlag && !(offHandItem?.flags || []).includes(o.itemFlag)) return false;
      if (typeof o.condition === 'function' && !o.condition(C)) return false;
      return true;
    });
    const ohProfInfo = getWeaponProficiencyInfo(C, offHandItem, ohOverride, equipmentSets);
    const ohAbility = weaponAbility(C, offHandItem, ohOverride);
    const ohMod = getMod(getFinal(C, ohAbility));
    const ohEnhancement = weaponEnhancement(offHandItem);
    const ohBase = weaponDamageBase(offHandItem);
    const ohDtype = weaponDamageType(offHandItem);
    const ohDmgMod = getOffHandDamageMod(ohMod, hasTWF) + ohEnhancement.damage;
    const ohSelectedEntry = selectedMasteriesByWeapon.get(normalizeWeaponName(offHandItem?.name || '')) || null;
    const ohDirectMastery = ohSelectedEntry ? resolveWeaponMasteryForItem(offHandItem) : null;
    const ohDbItem = ohSelectedEntry && !ohDirectMastery
      ? findWeaponItemByName(items, offHandItem?.name || '', offHandItem?.source || '')
      : null;
    const ohMastery = ohSelectedEntry
      ? (ohSelectedEntry.mastery || ohDirectMastery || resolveWeaponMasteryForItem(ohDbItem))
      : null;
    const isNick = ohMastery === 'Nick';
    const ohDamageFormula = ohBase ? ohBase + (ohDmgMod !== 0 ? (ohDmgMod >= 0 ? '+' : '') + ohDmgMod : '') : '';

    weaponActions.push({
      name: offHandItem.name,
      cat: isNick ? 'action' : 'bonus',
      uses: isNick ? 'Part of Attack action (Nick)' : 'Bonus Action (Light)',
      _source: 'Weapon',
      _colorBarCat: 'attack',
      attackBonus: (ohProfInfo.proficient ? getPB(C) + ohMod : ohMod) + ohEnhancement.attack,
      damageFormula: ohDamageFormula,
      damageButtonLabel: ohDamageFormula ? `Damage ${ohDamageFormula}${ohDtype ? ` ${ohDtype}` : ''}` : 'Damage',
      rollLabelPrefix: `Off-hand ${offHandItem.name}`,
      noDescription: true,
      _item: offHandItem,
      _enhancement: ohEnhancement.attack || ohEnhancement.damage ? ohEnhancement : null,
      _weaponIndex: ohIndex,
      _weaponSlot: offHandItem.equippedSlot || null,
      _weaponMastery: ohMastery || null,
      _weaponMasteryEntries: ohMastery ? getWeaponMasteryEntries(ohMastery) : null,
      _notProficient: !ohProfInfo.proficient,
      _disadvantage: false,
    });
  }

  const monkLevel = classLevel(C, 'Monk');
  const useDexUnarmed = monkLevel > 0 && getMod(getFinal(C, 'dex')) > getMod(getFinal(C, 'str'));
  const ability = useDexUnarmed ? 'dex' : 'str';
  const mod = getMod(getFinal(C, ability));
  const die = monkLevel >= 17 ? '1d12' : monkLevel >= 11 ? '1d10' : monkLevel >= 5 ? '1d8' : monkLevel >= 1 ? '1d6' : hasFeat(C, 'Tavern Brawler') ? '1d4' : '1';
  const unarmedSaveDc = 8 + getPB(C) + mod;
  weaponActions.push({
    name: 'Unarmed Strike',
    cat: 'action',
    _colorBarCat: 'attack',
    uses: monkLevel ? 'Martial Arts' : 'Attack',
    _source: 'Basic',
    attackBonus: getPB(C) + mod,
    damageFormula: die + (mod !== 0 ? (mod >= 0 ? '+' : '') + mod : ''),
    damageButtonLabel: `Damage ${die}${mod !== 0 ? (mod >= 0 ? '+' : '') + mod : ''} bludgeoning`,
    rollLabelPrefix: 'Unarmed Strike',
    noDescription: true,
    detailType: 'unarmedStrike',
    unarmedStrikeSaveDc: unarmedSaveDc,
    unarmedStrikeAbility: ability,
    unarmedStrikeMod: mod,
  });
  return weaponActions;
}

export function makeWeaponMasteryReminderActions(C, items = []) {
  const resolved = collectResolvedWeaponMasteries(C, items);
  return resolved.map((entry) => {
    const masteryLabel = entry.mastery ? ` — ${entry.mastery}` : '';
    return {
      name: `Weapon Mastery: ${entry.weaponName}${masteryLabel}`,
      cat: 'action',
      uses: 'Passive',
      _source: 'Weapon Mastery',
      noDescription: true,
    };
  });
}

export function resolveFormula(formula, action, C) {
  if (!formula) return '';
  if (typeof formula === 'function') return String(formula({ character: C, ownerLevel: action.ownerLevel ?? C?.classLevel ?? C?.level ?? 1 }) || '');
  return String(formula);
}

export function resolveButtonLabel(label, formula, action, C, fallback) {
  if (typeof label === 'function') return label({ formula, character: C, ownerLevel: action.ownerLevel ?? C?.classLevel ?? C?.level ?? 1 });
  return label || fallback;
}

