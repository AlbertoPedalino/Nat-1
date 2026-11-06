import { ensureSheetRuntimeAdapters } from './sheetRuntimeAdapters.js';
import { loadItems } from '../../charbuilder/data/itemData.js';
import { loadOptionalFeatures } from '../../charbuilder/data/classData.js';
import { loadConditions } from '../../charbuilder/data/rulesData.js';
import { reconcileInventoryWithItemsDb } from '../../charbuilder/data/inventoryReconcile.js';
import {
  collectReplicatePlanChoices,
} from '../../../shared/character/inventory/replicateMagicItem.js';
import {
  pruneReplicatedItemsForPlans,
} from '../../../shared/character/inventory/magicItemTinker.js';
import { normalizeCharacterAttunement } from '../inventory/attunement.js';
import {
  getAllResourceDefs,
  normalizeResourceMax,
  resourceFullValue,
} from '../resources/restResources.js';

// What opening a sheet needs besides the stored character: the reference data
// (cached per tab), the character reconciled with it, and its resources.

// The JSON fetcher caches raw files, but turning the full items/optional-feature
// datasets into sheet-ready records is also expensive. Share that processed
// work between every sheet mounted in this tab; a failed load is evicted so a
// later character can still retry it.
let itemsDbPromise = null;
let optionalFeaturesPromise = null;
let conditionsPromise = null;

function cachedReferenceLoad(current, load, clear) {
  if (current) return current;
  const pending = load();
  pending.catch(() => clear());
  return pending;
}

function loadCachedItems() {
  itemsDbPromise = cachedReferenceLoad(itemsDbPromise, loadItems, () => { itemsDbPromise = null; });
  return itemsDbPromise;
}

function loadCachedOptionalFeatures() {
  optionalFeaturesPromise = cachedReferenceLoad(
    optionalFeaturesPromise,
    loadOptionalFeatures,
    () => { optionalFeaturesPromise = null; },
  );
  return optionalFeaturesPromise;
}

function loadCachedConditions() {
  conditionsPromise = cachedReferenceLoad(conditionsPromise, loadConditions, () => { conditionsPromise = null; });
  return conditionsPromise;
}

// The adapters for this character and the reference data, each failing soft:
// a failed adapter chunk (e.g. a stale-deploy 404) must not blank the whole
// sheet — it falls back to base values and still renders the character.
export async function loadSheetReferenceData(character) {
  const [, itemsDb, optionalFeatures, conditionEntries] = await Promise.all([
    ensureSheetRuntimeAdapters(character),
    loadCachedItems().catch(() => []),
    loadCachedOptionalFeatures().catch(() => []),
    loadCachedConditions().catch(() => ({})),
  ]);
  return { itemsDb, optionalFeatures, conditionEntries: conditionEntries || {} };
}

// The stored character as the sheet works with it. Structured effect fields are
// re-merged from the items DB so calculations read canonical item records while
// user-managed inventory state is kept. `inventoryChanged` is true only when
// that changed the stored inventory (then it is worth saving).
export function reconcileLoadedCharacter(ch, itemsDb, optionalFeatures) {
  let character = ch;
  let inventoryChanged = false;
  if (ch && Array.isArray(ch.inventory)) {
    // Replacing a Replicate Magic Item plan immediately ends every item
    // made from that plan. Apply this before DB reconciliation so a stale
    // crafted item cannot survive by resolving against its old plan value.
    const currentPlans = collectReplicatePlanChoices(ch);
    const validInventory = pruneReplicatedItemsForPlans(ch.inventory, currentPlans);
    const refreshed = reconcileInventoryWithItemsDb(validInventory, itemsDb);
    const reconciled = normalizeCharacterAttunement({ ...ch, inventory: refreshed }, refreshed);
    if (reconciled !== ch.inventory) {
      character = { ...ch, inventory: reconciled };
      inventoryChanged = JSON.stringify(reconciled) !== JSON.stringify(ch.inventory);
    }
  }
  // Runtime only: the catalog is rebuilt on every open and never persisted
  // (runtimeFields.js strips it at every storage boundary).
  if (optionalFeatures?.length) character = { ...character, optionalFeatureEntries: optionalFeatures };
  return { character, inventoryChanged };
}

// Every resource the character has, at its stored value clamped to the current
// max (e.g. after a level-up changed Proficiency Bonus), or full when new.
// `changed` says whether that differs from what is stored.
export function initialSheetResources(character) {
  const stored = character.resources && typeof character.resources === 'object' ? character.resources : {};
  const merged = { ...stored };
  getAllResourceDefs(character).forEach((def) => {
    if (!def.key) return;
    const max = normalizeResourceMax(def, character);
    // 'used'-tracked pools (e.g. Lay on Hands) start empty (0 spent);
    // 'remaining'-tracked resources start full (max).
    const initial = resourceFullValue(def, max);
    const cur = merged[def.key];
    merged[def.key] = cur == null ? initial : Math.min(Math.max(0, Number(cur) || 0), max);
  });
  return { resources: merged, changed: JSON.stringify(merged) !== JSON.stringify(stored) };
}
