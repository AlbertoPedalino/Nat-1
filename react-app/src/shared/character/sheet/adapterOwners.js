import { adapterRegistry } from '../../../adapters/registry.js';
import { classEntities } from '../progression/classLevel.js';
import { ownedFeatNames } from '../progression/selectedFeats.js';
import { matchesRequiredChoice } from '../progression/lineageMatch.js';
import { inventoryHasFlag } from '../progression/choiceUtils.js';
import { asArray } from '../../lists.js';
import { stripSource } from '../../content/nameKeys.js';

// The one road from a character to the adapter behaviour that applies to them.
//
// The registry keeps every kind of entry (actions, resources, sheet effects,
// proficiencies, runtime config…) per owner: a class, a subclass, a species, a
// feat. Every reader used to walk those owners itself — each with its own
// coverage (some skipped feats), its own owner names and its own requirement
// rules. Here the walk, the names and the gate are written once:
//
//   characterOwners(C)            who owns behaviour on this character
//   ownerEntries(owner, slot)     that owner's registered entries of a slot
//                                 (with those of a record it stands on: the
//                                 registry joins a class skin to its base class
//                                 and a reprinted species to the one it copies)
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

// The character's species as an owner.
export function speciesOwner(C) {
  if (!C?.speciesName) return null;
  const source = C.speciesSource || '';
  return {
    kind: 'species',
    name: C.speciesName,
    speciesSource: source,
    label: C.speciesName,
    level: Number(C.level || 1),
    choicePrefix: '',
    sourceKey: `${C.speciesName}_${source}`,
  };
}

// An owner's entries of one registry slot ('SheetActions', 'SheetEffects',
// 'RuntimeConfig'…); empty when the slot has no such owner kind.
export function ownerEntries(owner, slot) {
  const getter = adapterRegistry[`get${KIND_NAMES[owner?.kind]}${slot}`];
  if (typeof getter !== 'function') return [];
  if (owner.kind === 'subclass') return getter.call(adapterRegistry, owner.className, owner.name);
  if (owner.kind === 'species') return getter.call(adapterRegistry, owner.name, owner.speciesSource);
  return getter.call(adapterRegistry, owner.name);
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

// `requiredChoice`: a stored choice the entry needs (any adapter entry). The
// owner's own multiclass copy of the choice is read first.
function choicePasses(entry, C, owner) {
  const requirement = entry.requiredChoice;
  if (!requirement?.key) return true;
  return matchesRequiredChoice(C, requirement, { prefix: owner?.choicePrefix || '' });
}

// `requiredItemFlag`: an item flag the inventory must hold.
function itemFlagPasses(entry, C, sheet) {
  const requirement = entry.requiredItemFlag;
  if (!requirement) return true;
  return inventoryHasFlag(sheet?.sheetInventory || C?.inventory || [], requirement);
}

// `requiredArmor`: the armor the entry holds without, each kind `false` —
// `{ heavy: false }` (Fast Movement, Roving), `{ body: false, shield: false }`
// (Unarmored Movement). Body armor is Light, Medium or Heavy.
const ARMOR_KINDS = {
  body: (type) => ['LA', 'MA', 'HA'].includes(type),
  heavy: (type) => type === 'HA',
  shield: (type) => type === 'S',
};

function armorPasses(entry, C, sheet) {
  const requirement = entry.requiredArmor;
  if (!requirement || typeof requirement !== 'object') return true;
  const worn = (sheet?.sheetInventory || C?.inventory || [])
    .filter((item) => item?.equipped)
    .map((item) => stripSource(item.type).toUpperCase());
  return Object.entries(requirement).every(([kind, allowed]) => (
    allowed !== false || !worn.some((type) => ARMOR_KINDS[kind]?.(type))
  ));
}

// Whether an entry is in force: its owner's level reaches `minLevel`, its
// choice, item and armor requirements are met and its `condition` holds. A
// requirement that throws counts as unmet.
export function entryApplies(entry, C, { owner = null, sheet = null, level = owner?.level } = {}) {
  if (!entry || typeof entry !== 'object') return false;
  const ownerLevel = Number(entry.ownerLevel ?? level ?? C?.level ?? 1);
  if (Number(entry.minLevel || 1) > ownerLevel) return false;
  try {
    if (!choicePasses(entry, C, owner)) return false;
    if (!itemFlagPasses(entry, C, sheet)) return false;
    if (!armorPasses(entry, C, sheet)) return false;
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
