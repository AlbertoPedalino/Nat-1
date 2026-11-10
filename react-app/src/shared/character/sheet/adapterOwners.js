import { KEYED_SLOTS, adapterRegistry, mergeRuntimeConfig } from '../../../adapters/registry.js';
import { classEntities } from '../progression/classLevel.js';
import { ownedFeatNames } from '../progression/selectedFeats.js';
import { matchesRequiredChoice } from '../progression/lineageMatch.js';
import { inventoryHasFlag } from '../progression/choiceUtils.js';
import { asArray } from '../../lists.js';

// The one road from a character to the adapter behaviour that applies to them.
//
// The registry keeps every kind of entry (actions, resources, sheet effects,
// proficiencies, runtime config…) per owner: a class, a subclass, a species, a
// feat. Every reader used to walk those owners itself — each with its own
// coverage (some skipped feats), its own owner names and its own requirement
// rules. Here the walk, the names and the gate are written once:
//
//   characterOwners(C)            who owns behaviour on this character
//   ownerEntries(owner, slot)     that owner's registered entries of a slot,
//                                 its own and those of the record it copies
//   entryApplies(entry, C, opts)  whether one entry is in force
//   collectOwnerEntries(C, slot)  all entries of a slot in force, with owner

const KIND_NAMES = Object.freeze({
  class: 'Class', subclass: 'Subclass', species: 'Species', feat: 'Feat',
});

// Each owner carries:
//   kind         'class' | 'subclass' | 'species' | 'feat'
//   name         the class, subclass short name, species or feat name
//   label        how a card names its source ("Draconic (Sorcerer)")
//   level        the level its gates read: the class's for a class and its
//                subclass, the character's for the rest
//   sourceKey    a stable id for deduplication
//   choicePrefix where its class's choices are saved ('' or `mc<i>_`)
//   keys         the registry keys its entries are read under: its own, then
//                the record it copies (Dwarf|WoW reads Dwarf|XPHB's too)
export function characterOwners(C) {
  if (!C) return [];
  const owners = [];
  classEntities(C).forEach((entity) => {
    const common = {
      level: entity.level,
      className: entity.className,
      choicePrefix: entity.choicePrefix,
      entity,
    };
    owners.push({
      ...common, kind: 'class', name: entity.className, label: entity.className, sourceKey: entity.className,
    });
    if (entity.subclassShortName) {
      owners.push({
        ...common,
        kind: 'subclass',
        name: entity.subclassShortName,
        subclassShortName: entity.subclassShortName,
        label: `${entity.subclassShortName} (${entity.className})`,
        sourceKey: `${entity.className}_${entity.subclassShortName}`,
      });
    }
  });
  const level = Number(C.level || 1);
  const species = speciesOwner(C);
  if (species) owners.push(species);
  ownedFeatNames(C).forEach((feat) => {
    owners.push({ kind: 'feat', name: feat, label: feat, level, choicePrefix: '', sourceKey: feat });
  });
  return owners;
}

// The character's species as an owner. A reprint (`copiedFrom`, saved with
// the species) also reads the entries of the species it copies.
export function speciesOwner(C) {
  if (!C?.speciesName) return null;
  const source = C.speciesSource || '';
  const copied = C.speciesObj?.copiedFrom || C.speciesSnapshot?.copiedFrom || null;
  return {
    kind: 'species',
    name: C.speciesName,
    speciesSource: source,
    label: C.speciesName,
    level: Number(C.level || 1),
    choicePrefix: '',
    sourceKey: `${C.speciesName}_${source}`,
    keys: [[C.speciesName, source], ...(copied?.name ? [[copied.name, copied.source || '']] : [])],
  };
}

function ownerKeys(owner) {
  if (Array.isArray(owner?.keys) && owner.keys.length) return owner.keys;
  if (owner?.kind === 'subclass') return [[owner.className, owner.name]];
  if (owner?.kind === 'species') return [[owner.name, owner.speciesSource]];
  return [[owner?.name]];
}

function entryIdentity(entry) {
  return entry && typeof entry === 'object' ? (entry.key || entry.name || null) : null;
}

// One slot's values under each of an owner's keys, own first, made one: lists
// join (the copied record's first, an own entry of the same key or name
// replacing it), choice adapters run both, objects merge with the own
// values winning.
function combineSlotValues(mode, values) {
  if (values.length === 1) return values[0];
  const [own, ...inherited] = values;
  if (mode === 'list') {
    const ownIds = new Set(asArray(own).map(entryIdentity).filter(Boolean));
    return [
      ...inherited.flatMap((list) => asArray(list).filter((entry) => !ownIds.has(entryIdentity(entry)))),
      ...asArray(own),
    ];
  }
  if (mode === 'fn') {
    const fns = [...inherited.reverse(), own].filter((fn) => typeof fn === 'function');
    if (fns.length < 2) return fns[0] || null;
    return (...args) => fns.flatMap((fn) => asArray(fn(...args)));
  }
  if (mode === 'object' || mode === 'merge') {
    return [...inherited.reverse(), own].reduce((acc, value) => (
      mode === 'merge' ? mergeRuntimeConfig(acc, value || {}) : { ...acc, ...(value || {}) }
    ), {});
  }
  return own ?? inherited.find((value) => value != null) ?? null;
}

// An owner's entries of one registry slot ('SheetActions', 'SheetEffects',
// 'RuntimeConfig'…); empty when the slot has no such owner kind.
export function ownerEntries(owner, slot) {
  const kindName = KIND_NAMES[owner?.kind];
  const getter = adapterRegistry[`get${kindName}${slot}`];
  if (typeof getter !== 'function') return [];
  const mode = KEYED_SLOTS.find((row) => row.get === slot && row.kinds.includes(kindName))?.mode;
  return combineSlotValues(mode, ownerKeys(owner).map((key) => getter.call(adapterRegistry, ...key)));
}

function conditionPasses(entry, C, context) {
  if (typeof entry?.condition !== 'function') return true;
  try {
    return Boolean(entry.condition(C, context));
  } catch {
    // Some conditions are written against the context alone.
    try {
      return Boolean(entry.condition(context));
    } catch {
      return false;
    }
  }
}

// A requirement on a stored choice, in any of the spellings adapters use:
// `requiredChoice` (effects, proficiencies, spells), `requiresChoice`
// (actions, resources), `choiceKey` + `model` (Armorer). The owner's own
// multiclass copy of the choice is read first.
function choicePasses(entry, C, owner) {
  const requirement = entry.requiredChoice
    || entry.requiresChoice
    || (entry.choiceKey && entry.model ? { key: entry.choiceKey, value: entry.model } : null);
  if (!requirement?.key) return true;
  return matchesRequiredChoice(C, requirement, { prefix: owner?.choicePrefix || '' });
}

function itemFlagPasses(entry, C, sheet) {
  const requirement = entry.requiredItemFlag || entry.requiresInventoryFlag;
  if (!requirement) return true;
  return inventoryHasFlag(sheet?.sheetInventory || C?.inventory || [], requirement);
}

// Whether an entry is in force: its owner's level reaches `minLevel`, its
// choice and item requirements are met and its `condition` holds. A
// requirement that throws counts as unmet.
export function entryApplies(entry, C, { owner = null, sheet = null, level = owner?.level } = {}) {
  if (!entry || typeof entry !== 'object') return false;
  const ownerLevel = Number(entry.ownerLevel ?? level ?? C?.level ?? 1);
  if (Number(entry.minLevel || 1) > ownerLevel) return false;
  try {
    if (!choicePasses(entry, C, owner)) return false;
    if (!itemFlagPasses(entry, C, sheet)) return false;
  } catch {
    return false;
  }
  return conditionPasses(entry, C, {
    character: C, sheet, ownerLevel, ownerName: owner?.name, ownerType: owner?.kind,
  });
}

// Every entry of `slot` in force on the character, each with its owner, in
// owner order (classes and their subclasses, species, feats).
export function collectOwnerEntries(C, slot, { sheet = null } = {}) {
  const out = [];
  characterOwners(C).forEach((owner) => {
    asArray(ownerEntries(owner, slot)).forEach((entry) => {
      if (entryApplies(entry, C, { owner, sheet })) out.push({ entry, owner });
    });
  });
  return out;
}
