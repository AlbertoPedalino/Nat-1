import {
  ALLOWED_SOURCES,
  CLASS_FILES,
  DATA_BASE,
  ITEM_SUMMARIES,
  SPELL_FILES,
} from '../constants.js';
import { normalizeName } from './text.js';
import { dedupeSpellsBySourcePriority, normalizeSpellRecord } from '../../../shared/character/spellNormalization.js';
import {
  compareSourcePriority,
  isSupportedSubclassFeature,
  isSupportedSubclassRecord,
} from '../../../shared/character/sourceFiltering.js';

async function getJson(path) {
  const response = await fetch(DATA_BASE + path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const DEBUG_LOADERS = import.meta.env.DEV;

function debugLog(...args) {
  if (DEBUG_LOADERS) console.log(...args);
}

export async function loadClassIndex() {
  const entries = await Promise.allSettled(CLASS_FILES.map((file) => getJson(`class/${file}`)));
  const cache = {};
  const classes = [];
  const subclasses = [];
  const classFeatures = [];
  const subclassFeatures = [];

  entries.forEach((entry, index) => {
    if (entry.status !== 'fulfilled') return;
    const file = CLASS_FILES[index];
    const data = entry.value;
    cache[file] = data;
    classes.push(...(data.class || []).filter((cls) => ALLOWED_SOURCES.includes(cls.source)));
    const allSubs = (data.subclass || []).filter(isSupportedSubclassRecord);
    const subByKey = {};
    allSubs.forEach((sub) => {
      const key = `${sub.className}|${sub.classSource}|${sub.shortName}`;
      const existing = subByKey[key];
      if (!existing) { subByKey[key] = sub; return; }
      if (compareSourcePriority(sub, existing) < 0) subByKey[key] = sub;
    });
    const supportedSubclasses = Object.values(subByKey);
    subclasses.push(...supportedSubclasses);
    classFeatures.push(...(data.classFeature || []).filter((feature) => !feature.isReprinted));
    subclassFeatures.push(...(data.subclassFeature || []).filter((feature) => (
      !feature.isReprinted && isSupportedSubclassFeature(feature, supportedSubclasses)
    )));
  });

  return {
    cache,
    classes: classes.sort((a, b) => a.name.localeCompare(b.name)),
    subclasses,
    classFeatures,
    subclassFeatures,
  };
}

export async function loadSpecies() {
  const data = await getJson('races.json');
  return (data.race || data.species || [])
    .filter((species) => ALLOWED_SOURCES.includes(species.source))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadBackgrounds() {
  const [data, fluffData] = await Promise.allSettled([
    getJson('backgrounds.json'),
    getJson('fluff-backgrounds.json'),
  ]);
  const backgrounds = (data.status === 'fulfilled' ? (data.value.background || []) : [])
    .filter((background) => ALLOWED_SOURCES.includes(background.source));
  if (fluffData.status === 'fulfilled') {
    const fluffIndex = {};
    (fluffData.value.backgroundFluff || []).forEach((entry) => {
      const key = `${entry.name}_${entry.source}`;
      if (entry.entries?.length) {
        const first = entry.entries[0];
        fluffIndex[key] = typeof first === 'string' ? first : (first?.entries?.[0] || '');
      }
    });
    backgrounds.forEach((bg) => {
      const key = `${bg.name}_${bg.source}`;
      if (fluffIndex[key]) bg._lore = fluffIndex[key];
    });
  }
  return backgrounds.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadFeats() {
  const data = await getJson('feats.json');
  return (data.feat || [])
    .filter((feat) => ALLOWED_SOURCES.includes(feat.source))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadSpells() {
  const entries = await Promise.allSettled(SPELL_FILES.map((file) => getJson(`spells/${file}`)));
  const spells = entries
    .flatMap((entry) => (entry.status === 'fulfilled' ? entry.value.spell || [] : []))
    .map(normalizeSpellRecord);
  const dedupedSpells = dedupeSpellsBySourcePriority(spells);

  debugLog('[loadSpells] Loaded', dedupedSpells.length, 'spells total');
  
  // Log first spell structure to understand format
  if (dedupedSpells.length > 0) {
    debugLog('[loadSpells] First spell:', dedupedSpells[0].name, 'classes:', dedupedSpells[0].classes);
  }

  let classSpellIndex = {};
  
  // Try to load gendata first (if it exists)
  try {
    const lookup = await getJson('generated/gendata-spell-source-lookup.json');
    debugLog('[loadSpells] Using gendata');
    classSpellIndex = buildClassSpellIndex(lookup);
  } catch (err) {
    debugLog('[loadSpells] gendata not found, error:', err.message);
    debugLog('[loadSpells] building from spell metadata');
    // If gendata doesn't exist, build index from spell metadata
    classSpellIndex = buildClassSpellIndexFromSpells(dedupedSpells);
  }

  debugLog('[loadSpells] Final classSpellIndex keys:', Object.keys(classSpellIndex));
  
  // Store in window for debugging
  if (DEBUG_LOADERS && typeof window !== 'undefined') {
    window.__DEBUG_CLASS_SPELL_INDEX__ = classSpellIndex;
    debugLog('[loadSpells] Stored in window.__DEBUG_CLASS_SPELL_INDEX__');
  }

  return {
    spells: dedupedSpells.sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name)),
    classSpellIndex,
  };
}

function buildClassSpellIndexFromSpells(spells) {
  const out = {};
  const CASTERS = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard', 'monk', 'rogue', 'fighter'];
  
  debugLog('[buildClassSpellIndexFromSpells] START - Processing', spells.length, 'spells');
  
  spells.forEach((spell) => {
    if (!spell.classes || typeof spell.classes !== 'object') return;
    
    // Handle fromClassList: [{ name: "Cleric" }, ...]
    const fromClassList = spell.classes.fromClassList || [];
    if (Array.isArray(fromClassList)) {
      fromClassList.forEach((entry) => {
        const className = normalizeName(entry?.name);
        if (CASTERS.includes(className)) {
          if (!out[className]) out[className] = new Set();
          out[className].add(String(spell.name || '').toLowerCase());
        }
      });
    }
    
    // Handle classes.class: { "Cleric": {}, "Wizard": {} } or { phb: { "Cleric": {} } }
    const classObj = spell.classes.class || {};
    if (typeof classObj === 'object') {
      Object.values(classObj).forEach((obj) => {
        if (typeof obj === 'object') {
          Object.keys(obj || {}).forEach((className) => {
            const key = normalizeName(className);
            if (CASTERS.includes(key)) {
              if (!out[key]) out[key] = new Set();
              out[key].add(String(spell.name || '').toLowerCase());
            }
          });
        }
      });
    }
  });
  
  const result = Object.fromEntries(Object.entries(out).map(([key, value]) => [key, [...value]]));
  debugLog('[buildClassSpellIndexFromSpells] RESULT:', result);
  return result;
}

function buildClassSpellIndex(node) {
  const out = {};
  const CASTERS = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard', 'monk', 'rogue', 'fighter'];
  if (!node || typeof node !== 'object') {
    debugLog('[buildClassSpellIndex] Invalid node');
    return out;
  }
  
  debugLog('[buildClassSpellIndex] Processing gendata with', Object.keys(node).length, 'sources');
  
  const collect = (className, spellName) => {
    const key = normalizeName(className);
    if (!CASTERS.includes(key)) return;
    if (!out[key]) out[key] = new Set();
    out[key].add(String(spellName || '').toLowerCase());
  };
  
  // Track which classes have entries in info.class (core class list)
  const hasClassSpells = new Set();
  
  // PASS 1: Collect from info.class only
  Object.values(node).forEach((sourceBlock) => {
    if (!sourceBlock || typeof sourceBlock !== 'object') return;
    Object.entries(sourceBlock).forEach(([spellName, info]) => {
      if (!info || typeof info !== 'object') return;
      const classMap = info.class;
      if (classMap && typeof classMap === 'object') {
        Object.values(classMap).forEach((bySource) => {
          if (!bySource || typeof bySource !== 'object') return;
          Object.keys(bySource).forEach((className) => {
            const key = normalizeName(className);
            if (CASTERS.includes(key)) hasClassSpells.add(key);
            collect(className, spellName);
          });
        });
      }
    });
  });
  
  // PASS 2: Collect from info.subclass only for classes WITHOUT their own class spell list
  // (e.g., Fighter/Eldritch Knight, Rogue/Arcane Trickster - they have no core class spells)
  Object.values(node).forEach((sourceBlock) => {
    if (!sourceBlock || typeof sourceBlock !== 'object') return;
    Object.entries(sourceBlock).forEach(([spellName, info]) => {
      if (!info || typeof info !== 'object') return;
      const subclassMap = info.subclass;
      if (subclassMap && typeof subclassMap === 'object') {
        Object.values(subclassMap).forEach((bySource) => {
          if (!bySource || typeof bySource !== 'object') return;
          Object.keys(bySource).forEach((className) => {
            if (!hasClassSpells.has(normalizeName(className))) {
              collect(className, spellName);
            }
          });
        });
      }
    });
  });
  
  const result = Object.fromEntries(Object.entries(out).map(([key, value]) => [key, [...value]]));
  debugLog('[buildClassSpellIndex] Final result keys:', Object.keys(result), 'total spells by class:', result);
  return result;
}

const ITEM_SOURCES_2024 = ['XPHB', 'XDMG', 'EFA', 'FRAiF', 'FRHoF'];
const PHB_2024_EQUIPMENT_TYPES = ['M', 'R', 'LA', 'MA', 'HA', 'S', 'A', 'G', 'AT', 'GS', 'INS', 'SCF', 'WD', 'RD', 'ST'];

function itemSource(item) {
  return String(item?.source || '').trim();
}

function reprintedSource(item, allowedSources = ITEM_SOURCES_2024) {
  if (!Array.isArray(item?.reprintedAs)) return '';
  const allowed = new Set(allowedSources);
  const found = item.reprintedAs
    .map((entry) => String(entry || '').split('|')[1] || '')
    .find((source) => allowed.has(source));
  return found || '';
}

function canonicalItemSource(item) {
  const source = itemSource(item);
  if (ITEM_SOURCES_2024.includes(source)) return source;
  return reprintedSource(item);
}

function isItem2024(item) {
  return Boolean(canonicalItemSource(item));
}

function isAllowedPhbEquipment(item) {
  if (!item) return false;
  if (itemSource(item) !== 'PHB') return false;
  const type = String(item.type || '').split('|')[0].toUpperCase();
  if (!PHB_2024_EQUIPMENT_TYPES.includes(type)) return false;
  if (item.rarity && item.rarity !== 'none') return false;
  return canonicalItemSource(item) === 'XPHB';
}

function isAllowedMagicVariant(variant) {
  if (!variant) return false;
  const inherited = variant.inherits || {};
  return Boolean(
    canonicalItemSource(variant)
    || canonicalItemSource(inherited)
    || reprintedSource(variant, ['XDMG', 'XPHB', 'EFA', 'FRAiF', 'FRHoF'])
  );
}

function withCanonicalSource(item) {
  const canonical = canonicalItemSource(item);
  if (!canonical) return item;
  const source = itemSource(item);
  return {
    ...item,
    source: canonical,
    legacySource: source && source !== canonical ? source : item.legacySource || null,
  };
}

export async function loadItems() {
  const [base, magic, variants] = await Promise.allSettled([
    getJson('items-base.json'),
    getJson('items.json'),
    getJson('magicvariants.json'),
  ]);

  const baseItems = base.status === 'fulfilled'
    ? (base.value.baseitem || [])
        .filter((item) => isItem2024(item) || isAllowedPhbEquipment(item))
        .map(withCanonicalSource)
    : [];

  const magicItems = magic.status === 'fulfilled'
    ? (magic.value.item || [])
        .filter(isItem2024)
        .map(withCanonicalSource)
    : [];

  const magicVariants = variants.status === 'fulfilled'
    ? expandMagicVariants(
        (variants.value.magicvariant || []).filter(isAllowedMagicVariant),
        baseItems,
      ).map(withCanonicalSource)
    : [];

  const all = [
    ...ITEM_SUMMARIES.map(withCanonicalSource),
    ...baseItems,
    ...magicItems,
    ...magicVariants,
  ].filter(isItem2024);

  const byName = new Map();
  all.forEach((item) => {
    if (!item?.name) return;
    const key = normalizeName(formatLeadingBonusName(item.name));
    const existing = byName.get(key);
    if (!existing) { byName.set(key, item); return; }
    if (shouldReplaceItem(existing, item)) byName.set(key, item);
  });

  return [...byName.values()]
    .map(normalizeItem)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function sourcePriority(item) {
  const source = canonicalItemSource(item);
  const order = ['XPHB', 'XDMG', 'EFA', 'FRAiF', 'FRHoF'];
  const idx = order.indexOf(source);
  return idx === -1 ? 999 : idx;
}

function shouldReplaceItem(existing, incoming) {
  const incomingPriority = sourcePriority(incoming);
  const existingPriority = sourcePriority(existing);
  if (incomingPriority !== existingPriority) return incomingPriority < existingPriority;

  const incomingRichness = itemRichness(incoming);
  const existingRichness = itemRichness(existing);
  if (incomingRichness !== existingRichness) return incomingRichness > existingRichness;

  return Boolean(incoming.legacySource) === false && Boolean(existing.legacySource);
}

function itemRichness(item) {
  let score = 0;
  if (item.dmg1) score += 4;
  if (item.ac) score += 4;
  if (Array.isArray(item.property) && item.property.length) score += 2;
  if (item.weaponCategory) score += 2;
  if (Array.isArray(item.entries) && item.entries.length) score += 1;
  if (item.type && !['weapon', 'armor', 'gear', 'magic'].includes(String(item.type).toLowerCase())) score += 1;
  return score;
}

function normalizeItem(item) {
  const rawType = item.type ? String(item.type).split('|')[0] : '';
  return {
    name: formatLeadingBonusName(item.name),
    source: canonicalItemSource(item) || item.source || '',
    legacySource: item.legacySource || null,
    type: rawType || 'gear',
    rarity: item.rarity || 'none',
    weight: Number(item.weight || 0),
    value: Number(item.value || 0),
    weaponCategory: item.weaponCategory || null,
    mastery: Array.isArray(item.mastery) ? item.mastery.map((m) => String(m).split('|')[0]) : null,
    dmg1: item.dmg1 || null,
    dmg2: item.dmg2 || null,
    dmgType: item.dmgType || null,
    ac: item.ac || null,
    strength: item.strength || null,
    stealth: !!item.stealth,
    bonusWeapon: item.bonusWeapon || null,
    bonusAc: item.bonusAc || null,
    property: Array.isArray(item.property) ? item.property.map((p) => String(p).split('|')[0]) : [],
    entries: item.entries || [],
    packContents: item.packContents || null,
  };
}

function expandMagicVariants(variants, baseItems) {
  const expanded = [];
  variants.forEach((variant) => {
    const inherits = variant.inherits || {};
    const requires = variant.requires || [];
    const variantSource = canonicalItemSource(variant)
      || canonicalItemSource(inherits)
      || reprintedSource(variant, ['XDMG', 'XPHB', 'EFA', 'FRAiF', 'FRHoF']);

    if (!variantSource) return;

    if (!requires.length && variant.name) {
      expanded.push(withCanonicalSource({
        ...inherits,
        name: formatLeadingBonusName(variant.name),
        source: variantSource,
      }));
      return;
    }

    baseItems.forEach((base) => {
      if (!matchesRequires(base, requires)) return;
      expanded.push(withCanonicalSource({
        ...base,
        ...inherits,
        name: formatVariantName(base.name, inherits),
        source: variantSource || base.source,
      }));
    });
  });
  return expanded;
}

function formatVariantName(baseName, inherits) {
  const prefix = String(inherits.namePrefix || '').trim();
  const suffix = String(inherits.nameSuffix || '').trim();
  if (/^\+\d+$/.test(prefix)) return `${baseName} ${prefix}${suffix ? ` ${suffix}` : ''}`.trim();
  return `${prefix ? `${prefix} ` : ''}${baseName}${suffix ? ` ${suffix}` : ''}`.trim();
}

function matchesRequires(item, requires) {
  if (!requires.length) return true;
  return requires.some((requirement) => {
    const type = String(item.type || '').split('|')[0].toUpperCase();
    if (requirement.type) {
      const reqType = String(requirement.type || '').split('|')[0].toUpperCase();
      if (reqType === 'WEAPON' && !isWeaponType(type)) return false;
      else if (reqType === 'ARMOR' && !isArmorType(type)) return false;
      else if (!['WEAPON', 'ARMOR'].includes(reqType) && reqType !== type) return false;
    }
    if (requirement.weapon && !isWeaponType(type)) return false;
    if (requirement.weaponCategory && requirement.weaponCategory !== item.weaponCategory) return false;
    if (requirement.armor && !isArmorType(type)) return false;
    return true;
  });
}

function formatLeadingBonusName(name) {
  return String(name || '').replace(/^(\+\d+)\s+(.+)$/i, '$2 $1').trim();
}

function isWeaponType(type) {
  return ['M', 'R'].includes(type);
}

function isArmorType(type) {
  return ['LA', 'MA', 'HA', 'S'].includes(type);
}
