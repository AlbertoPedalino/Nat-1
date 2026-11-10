import { SPELL_FILES } from './catalogFiles.js';
import { dedupeSpellsBySourcePriority, normalizeSpellRecord } from '../../character/spells/spellNormalization.js';
import { CLASS_ALLOWED_SOURCES, SPELL_SOURCE_PRIORITY, isBookAllowed } from '../sourcePriority.js';
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

// Class lists are read for the classes of the supported books only (the
// generated lookup also carries the 2014 lists), each under its class name:
// a World of Warcraft skin has its own list (Mage, Priest, Death Knight…), or
// the very list of the base class it shares its name with (Druid, Paladin).
function isSupportedClassSource(classSource) {
  return CLASS_ALLOWED_SOURCES.includes(String(classSource || '').trim());
}

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
  let classSpellBooks = null;

  // Try to load gendata first (if it exists)
  try {
    const lookup = await loadGameData('generated/gendata-spell-source-lookup.json');
    debugLog('[loadSpells] Using gendata');
    classSpellBooks = buildClassSpellBooks(lookup);
    classSpellIndex = classSpellIndexForBooks(classSpellBooks);
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
    // Per book (buildClassSpellBooks), for a character's own books; null when
    // the lists come from the spells themselves (their own books apply).
    classSpellBooks,
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
        if (className && isSupportedClassSource(entry?.source)) {
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
        if (className && isSupportedClassVariant(entry)) {
          if (!out[className]) out[className] = new Set();
          out[className].add(String(spell.name || '').toLowerCase());
        }
      });
    }

    // Handle classes.class: { "Cleric": {}, "Wizard": {} } or { phb: { "Cleric": {} } }
    const classObj = spell.classes.class || {};
    if (typeof classObj === 'object') {
      Object.entries(classObj).forEach(([classSource, obj]) => {
        if (typeof obj === 'object' && isSupportedClassSource(classSource)) {
          Object.keys(obj || {}).forEach((className) => {
            const key = matchKey(className);
            if (key) {
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

// Which books put a spell on a class's list: { class: { spell: [book…] } } —
// the class's own book for its core list, the defining book for an addition
// (AU's Battle Familiar on the Druid list). A character's books narrow it
// (classSpellIndexForBooks).
export function buildClassSpellBooks(node) {
  const out = {};
  if (!node || typeof node !== 'object') return out;

  const collect = (className, spellName, books) => {
    const key = matchKey(className);
    if (!key) return;
    const spell = String(spellName || '').toLowerCase();
    if (!out[key]) out[key] = {};
    out[key][spell] = [...new Set([...(out[key][spell] || []), ...books])];
  };

  // Classes that have their own list (the rest — Fighter, Rogue — take the
  // lists of their spellcasting subclasses).
  const hasClassSpells = new Set();

  const visitClassMap = (classMap, visitor, { variant = false } = {}) => {
    if (!classMap || typeof classMap !== 'object') return;
    Object.entries(classMap).forEach(([classSource, bySource]) => {
      if (!bySource || typeof bySource !== 'object' || !isSupportedClassSource(classSource)) return;
      Object.entries(bySource).forEach(([className, metadata]) => {
        if (variant && !isSupportedClassVariant(metadata)) return;
        const books = variant
          ? classVariantSources(metadata).filter((source) => SPELL_SOURCE_PRIORITY.includes(String(source || '').trim()))
          : [classSource];
        visitor(className, books);
      });
    });
  };

  Object.values(node).forEach((sourceBlock) => {
    if (!sourceBlock || typeof sourceBlock !== 'object') return;
    Object.entries(sourceBlock).forEach(([spellName, info]) => {
      if (!info || typeof info !== 'object') return;
      const collectClassSpell = (className, books) => {
        hasClassSpells.add(matchKey(className));
        collect(className, spellName, books);
      };
      visitClassMap(info.class, collectClassSpell);
      visitClassMap(info.classVariant, collectClassSpell, { variant: true });
    });
  });

  Object.values(node).forEach((sourceBlock) => {
    if (!sourceBlock || typeof sourceBlock !== 'object') return;
    Object.entries(sourceBlock).forEach(([spellName, info]) => {
      const subclassMap = info?.subclass;
      if (!subclassMap || typeof subclassMap !== 'object') return;
      Object.entries(subclassMap).forEach(([classSource, bySource]) => {
        if (!bySource || typeof bySource !== 'object' || !isSupportedClassSource(classSource)) return;
        Object.keys(bySource).forEach((className) => {
          if (!hasClassSpells.has(matchKey(className))) collect(className, spellName, [classSource]);
        });
      });
    });
  });
  return out;
}

// The class lists ({ class: [spell…] }) of the books a character uses — every
// book when `character` is null.
export function classSpellIndexForBooks(classSpellBooks, character = null) {
  return Object.fromEntries(Object.entries(classSpellBooks || {}).map(([className, spells]) => [
    className,
    Object.entries(spells)
      .filter(([, books]) => !character || books.some((book) => isBookAllowed(character, book)))
      .map(([spell]) => spell),
  ]));
}

export function buildClassSpellIndex(node) {
  return classSpellIndexForBooks(buildClassSpellBooks(node));
}
