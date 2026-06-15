import { installedRegistry } from '../../adapters/index.js';
import { isGrantUnlocked } from './spellGrants.js';

/**
 * Shared enumeration of auto-granted spells from class/subclass/species runtime
 * config (`alwaysKnownSpells` + `alwaysPreparedSpells`).
 *
 * This is the single source of truth for *which* grants a character has and
 * whether they are unlocked & level-available. The builder and the character
 * sheet both consume it, then project the canonical records into their own
 * shapes (string label vs source object, free casts, multi-source union, …).
 * Keeping the enumeration+gating here is what stops the two surfaces from
 * drifting (the historical "Find Familiar shown without Pact of the Chain" bug).
 *
 * A canonical record is intentionally *raw*: it exposes the pieces every
 * consumer needs and bakes in no presentation. Shape:
 *   {
 *     name, minLevel, level, mode,           // grant identity
 *     origin: 'class' | 'species',           // class also covers subclass cfg
 *     ownerClassName, subclassShortName,      // provenance (subclass fields only
 *     subclassName,                           //  when granted BY the subclass)
 *     explicitSource, sourceType, ability,    // raw adapter hints (may be null)
 *     entry,                                  // original adapter entry (free casts, …)
 *   }
 */

function toEntry(spell, mode) {
  return {
    ...(spell && typeof spell === 'object' ? spell : { name: spell }),
    mode,
  };
}

function gatedEntries(spellcasting, character, level) {
  if (!spellcasting) return [];
  return [
    ...(spellcasting.alwaysKnownSpells || []).map((spell) => toEntry(spell, 'known')),
    ...(spellcasting.alwaysPreparedSpells || []).map((spell) => toEntry(spell, 'prepared')),
  ].filter((entry) => entry.name
    && level >= Number(entry.minLevel || 1)
    && isGrantUnlocked(entry, character));
}

/**
 * Grants from one class entity (its class config + its subclass config).
 * @param {{ className: string, subclassShortName?: string, level?: number }} entity
 */
export function enumerateClassGrants(entity, character) {
  const level = Number(entity?.level || 1);
  const subclassName = subclassFullName(entity);
  const configs = [
    { spellcasting: installedRegistry.getClassRuntimeConfig(entity?.className)?.spellcasting, fromSubclass: false },
    { spellcasting: installedRegistry.getSubclassRuntimeConfig(entity?.className, entity?.subclassShortName)?.spellcasting, fromSubclass: true },
  ];
  const out = [];
  configs.forEach(({ spellcasting, fromSubclass }) => {
    gatedEntries(spellcasting, character, level).forEach((entry) => {
      out.push({
        name: entry.name,
        minLevel: Number(entry.minLevel || 1),
        level: entry.level ?? null,
        mode: entry.mode,
        origin: 'class',
        ownerClassName: entity?.className || null,
        subclassShortName: fromSubclass ? (entity?.subclassShortName || null) : null,
        subclassName: fromSubclass ? subclassName : null,
        explicitSource: entry.source || null,
        sourceType: entry.sourceType || null,
        ability: entry.ability || null,
        entry,
      });
    });
  });
  return out;
}

// Full subclass name ("Oath of Glory") resolved from the entity's subclass
// features, which carry both shortName and full name in 5etools data.
function subclassFullName(entity) {
  const shortName = entity?.subclassShortName;
  if (!shortName) return null;
  return (entity?.allSubFeatures || []).find(
    (feature) => feature?.subclassShortName === shortName && feature?.subclassName,
  )?.subclassName || null;
}

/** Grants from the character's species. */
export function enumerateSpeciesGrants(character) {
  const spellcasting = installedRegistry.getSpeciesRuntimeConfig(
    character?.speciesName,
    character?.speciesSource,
  )?.spellcasting || {};
  const chosenAbility = character?.normalizedChoices?.species?.spellAbility || null;
  const level = Number(character?.level || 1);
  return gatedEntries(spellcasting, character, level).map((entry) => ({
    name: entry.name,
    minLevel: Number(entry.minLevel || 1),
    level: entry.level ?? null,
    mode: entry.mode,
    origin: 'species',
    ownerClassName: null,
    subclassShortName: null,
    explicitSource: entry.source || null,
    sourceType: entry.sourceType || null,
    ability: entry.ability || spellcasting.ability || chosenAbility || null,
    entry,
  }));
}

// --- Subclass-feature spell scraping ------------------------------------------
// Some subclasses grant spells via prose/tables in a feature's body (e.g. a
// "Circle Spells" table) rather than via runtime-config `alwaysPreparedSpells`.
// These are scraped from `{@spell ...}` tags in the feature entries. They carry
// no gate tags (they come from text), so they are unconditional per
// subclass+level — but they still belong in the same shared enumeration so both
// the builder and the sheet compute them live (no snapshot dependency).

function spellTagName(value) {
  return String(value || '').split('|')[0].trim();
}

function pushSpellTags(text, out) {
  const regex = /\{@spell\s+([^}]+)\}/gi;
  let match = regex.exec(String(text || ''));
  while (match) {
    const name = spellTagName(match[1]);
    if (name) out.push(name);
    match = regex.exec(String(text || ''));
  }
}

function rowMinLevel(row) {
  const first = Array.isArray(row) ? row[0] : row?.row?.[0];
  if (first == null) return null;
  const match = String(first).match(/\d+/);
  const level = match ? Number(match[0]) : null;
  return level && level >= 1 && level <= 20 ? level : null;
}

function collectSpellTags(node, classLevel, out = []) {
  if (!node) return out;
  if (typeof node === 'string') {
    pushSpellTags(node, out);
    return out;
  }
  if (Array.isArray(node)) {
    const level = rowMinLevel(node);
    if (level && level > classLevel) return out;
    node.forEach((item) => collectSpellTags(item, classLevel, out));
    return out;
  }
  if (typeof node !== 'object') return out;
  if (node.type === 'table' && Array.isArray(node.rows)) {
    node.rows.forEach((row) => collectSpellTags(row, classLevel, out));
    return out;
  }
  ['entries', 'entry', 'items', 'rows', 'row'].forEach((key) => collectSpellTags(node[key], classLevel, out));
  return out;
}

/**
 * Grants scraped from subclass *feature text* for one class entity.
 * @param {{ className?: string, subclassShortName?: string, level?: number, allSubFeatures?: object[] }} entity
 */
export function enumerateSubclassFeatureSpells(entity) {
  const level = Number(entity?.level || 1);
  const subclassShortName = String(entity?.subclassShortName || '');
  if (!subclassShortName) return [];
  const out = [];
  (entity?.allSubFeatures || [])
    .filter((feature) => !feature?.isReprinted)
    .filter((feature) => !feature?.subclassShortName || feature.subclassShortName === subclassShortName)
    .filter((feature) => Number(feature?.level || 1) <= level)
    .filter((feature) => /spells?/i.test(String(feature?.name || '')))
    .forEach((feature) => {
      collectSpellTags(feature.entries, level).forEach((name) => {
        out.push({
          name,
          minLevel: Number(feature.level || 1),
          level: null,
          mode: 'prepared',
          origin: 'class',
          ownerClassName: entity?.className || null,
          subclassShortName,
          subclassName: feature.subclassName || null,
          // explicitSource is reserved for an adapter's *curated* label (e.g.
          // "Facilitated Revival"). A scraped feature has none — its name is the
          // verbose "<Subclass> Spells" — so leave it null and let grantSourceLabel
          // derive the subclass identity, matching config grants that omit `source`.
          explicitSource: null,
          sourceType: 'subclass',
          ability: null,
          entry: feature,
        });
      });
    });
  return out;
}

/** Class entities (primary + multiclass) shaped for the enumerators. */
function classEntities(character) {
  return [
    {
      className: character?.className,
      subclassShortName: character?.subclassShortName,
      level: character?.classLevel || character?.level || 1,
      allSubFeatures: character?.allSubFeatures || [],
    },
    ...((character?.extraClasses || []).map((ec) => ({
      className: ec.name,
      subclassShortName: ec.subclassShortName,
      level: ec.level || 1,
      allSubFeatures: ec.allSubFeatures || [],
    }))),
  ];
}

function normName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * All grants for one class entity: runtime config + subclass-feature text.
 * A feature-text scrape of a spell already granted by runtime config is dropped
 * (the config record is richer: gates, ability, free casts) — otherwise e.g.
 * Oath of Glory spells would tag twice. Single composition point for every
 * consumer that works per-entity (builder spell panel) or whole-character
 * (sheet, via enumerateAutoGrantedSpells).
 */
export function enumerateEntityGrants(entity, character) {
  const configGrants = enumerateClassGrants(entity, character);
  const granted = new Set(configGrants.map((r) => normName(r.name)));
  return [
    ...configGrants,
    ...enumerateSubclassFeatureSpells(entity).filter((r) => !granted.has(normName(r.name))),
  ];
}

/**
 * Canonical display label for a grant record: adapter-declared source first,
 * then the granting subclass's full name, shortName, owner class, fallback.
 * Both the builder and the sheet derive their tags from this.
 */
export function grantSourceLabel(record, fallback = 'Auto') {
  return record?.explicitSource
    || record?.subclassName
    || record?.subclassShortName
    || record?.ownerClassName
    || fallback;
}

/**
 * All auto-granted spells for a character: every class entity (primary +
 * multiclass) plus species. Distinct-origin duplicates are kept; consumers
 * decide how to collapse same-named grants across entities.
 */
export function enumerateAutoGrantedSpells(character) {
  const out = [];
  classEntities(character).forEach((entity) => {
    enumerateEntityGrants(entity, character).forEach((r) => out.push(r));
  });
  enumerateSpeciesGrants(character).forEach((r) => out.push(r));
  return out;
}
