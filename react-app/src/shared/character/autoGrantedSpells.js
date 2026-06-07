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
 *     ownerClassName, subclassShortName,      // provenance
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
  const configs = [
    installedRegistry.getClassRuntimeConfig(entity?.className)?.spellcasting,
    installedRegistry.getSubclassRuntimeConfig(entity?.className, entity?.subclassShortName)?.spellcasting,
  ];
  const out = [];
  configs.forEach((spellcasting) => {
    gatedEntries(spellcasting, character, level).forEach((entry) => {
      out.push({
        name: entry.name,
        minLevel: Number(entry.minLevel || 1),
        level: entry.level ?? null,
        mode: entry.mode,
        origin: 'class',
        ownerClassName: entity?.className || null,
        subclassShortName: entity?.subclassShortName || null,
        explicitSource: entry.source || null,
        sourceType: entry.sourceType || null,
        ability: entry.ability || null,
        entry,
      });
    });
  });
  return out;
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
          explicitSource: feature.name || subclassShortName,
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

/**
 * All auto-granted spells for a character: every class entity (primary +
 * multiclass; runtime config + subclass-feature text) plus species. Records are
 * not deduped — consumers decide how to collapse same-named grants.
 */
export function enumerateAutoGrantedSpells(character) {
  const out = [];
  classEntities(character).forEach((entity) => {
    enumerateClassGrants(entity, character).forEach((r) => out.push(r));
    enumerateSubclassFeatureSpells(entity).forEach((r) => out.push(r));
  });
  enumerateSpeciesGrants(character).forEach((r) => out.push(r));
  return out;
}
