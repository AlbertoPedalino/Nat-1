import { SPELL_FILES } from './catalogFiles.js';
import { dedupeSpellsBySourcePriority, normalizeSpellRecord } from '../../character/spells/spellNormalization.js';
import { SPELL_SOURCE_PRIORITY } from '../sourcePriority.js';
import { matchKey } from '../nameKeys.js';
import { loadGameData } from '../gameData.js';
import { byName } from '../../lists.js';

// The spell catalog and the class spell lists (which class may learn which
// spell), from the generated source lookup or, failing that, the spells' own
// class metadata.

const DEBUG_LOADERS = Boolean(import.meta.env?.DEV);

function debugLog(...args) {
  if (DEBUG_LOADERS) console.log(...args);
}

const CASTERS = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard', 'monk', 'rogue', 'fighter'];

export async function loadSpells() {
  const entries = await Promise.allSettled(SPELL_FILES.map((file) => loadGameData(`spells/${file}`)));
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
    const lookup = await loadGameData('generated/gendata-spell-source-lookup.json');
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
    spells: dedupedSpells.sort((a, b) => (a.level - b.level) || byName(a, b)),
    // Item references can explicitly request a lower-priority printing.
    spellVersions: spells,
    classSpellIndex,
    failedFiles: SPELL_FILES.filter((_, index) => entries[index].status === 'rejected'),
  };
}

function classVariantSources(entry) {
  if (!entry || typeof entry !== 'object') return [];
  if (Array.isArray(entry.definedInSources)) return entry.definedInSources;
  if (entry.definedInSource) return [entry.definedInSource];
  return [];
}

function isSupportedClassVariant(entry) {
  return classVariantSources(entry).some((source) => SPELL_SOURCE_PRIORITY.includes(String(source || '').trim()));
}

export function buildClassSpellIndexFromSpells(spells) {
  const out = {};

  debugLog('[buildClassSpellIndexFromSpells] START - Processing', spells.length, 'spells');

  spells.forEach((spell) => {
    if (!spell.classes || typeof spell.classes !== 'object') return;

    // Handle fromClassList: [{ name: "Cleric" }, ...]
    const fromClassList = spell.classes.fromClassList || [];
    if (Array.isArray(fromClassList)) {
      fromClassList.forEach((entry) => {
        const className = matchKey(entry?.name);
        if (CASTERS.includes(className)) {
          if (!out[className]) out[className] = new Set();
          out[className].add(String(spell.name || '').toLowerCase());
        }
      });
    }

    // 5etools stores source-book additions to a class spell list separately
    // from the core list. Only accept additions defined by one of the manuals
    // this project actually loads (for example AU), otherwise optional lists
    // from unsupported books would leak into the builder.
    const fromClassListVariant = spell.classes.fromClassListVariant || [];
    if (Array.isArray(fromClassListVariant)) {
      fromClassListVariant.forEach((entry) => {
        const className = matchKey(entry?.name);
        if (CASTERS.includes(className) && isSupportedClassVariant(entry)) {
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
            const key = matchKey(className);
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

export function buildClassSpellIndex(node) {
  const out = {};
  if (!node || typeof node !== 'object') {
    debugLog('[buildClassSpellIndex] Invalid node');
    return out;
  }

  debugLog('[buildClassSpellIndex] Processing gendata with', Object.keys(node).length, 'sources');

  const collect = (className, spellName) => {
    const key = matchKey(className);
    if (!CASTERS.includes(key)) return;
    if (!out[key]) out[key] = new Set();
    out[key].add(String(spellName || '').toLowerCase());
  };

  // Track which classes have entries in info.class (core class list)
  const hasClassSpells = new Set();

  const visitClassMap = (classMap, visitor, { variant = false } = {}) => {
    if (!classMap || typeof classMap !== 'object') return;
    Object.values(classMap).forEach((bySource) => {
      if (!bySource || typeof bySource !== 'object') return;
      Object.entries(bySource).forEach(([className, metadata]) => {
        if (variant && !isSupportedClassVariant(metadata)) return;
        visitor(className);
      });
    });
  };

  // PASS 1: Collect core class lists and supported source-book additions.
  Object.values(node).forEach((sourceBlock) => {
    if (!sourceBlock || typeof sourceBlock !== 'object') return;
    Object.entries(sourceBlock).forEach(([spellName, info]) => {
      if (!info || typeof info !== 'object') return;
      const collectClassSpell = (className) => {
        const key = matchKey(className);
        if (CASTERS.includes(key)) hasClassSpells.add(key);
        collect(className, spellName);
      };
      visitClassMap(info.class, collectClassSpell);
      visitClassMap(info.classVariant, collectClassSpell, { variant: true });
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
            if (!hasClassSpells.has(matchKey(className))) {
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
