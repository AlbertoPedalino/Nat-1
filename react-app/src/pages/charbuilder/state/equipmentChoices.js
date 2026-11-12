import { addInventoryEntries, removeInventoryEntries, stepInventoryQty } from '../../../shared/character/inventory/itemContainers.js';
import { normalizeCoinAmount } from '../../../shared/character/inventory/currency.js';
import { splitNameSource } from '../../../shared/content/nameKeys.js';
import { collectChoiceBlocks, cpToCoins, extractEquipItems, resolveEquipmentItems } from '../steps/startingEquipment.js';

// The starting-equipment picks of a class or background, and what they put
// in the inventory and purse. A pick gives an option's items and coins; the
// pick undone — another option, the same one again, a new class or
// background — takes them back, with the gear chosen for its gear-type
// slots. What is no longer there (removed or spent by hand) is skipped.

// One unit of `Name|SOURCE` off the inventory (a gear-type slot pick).
export function removeOneByRef(inventory, ref) {
  const { name, source } = splitNameSource(ref);
  const index = (inventory || []).findIndex((item) => item.name === name && (item.source || '') === source);
  return index === -1 ? inventory || [] : stepInventoryQty(inventory, index, -1);
}

function optionGrant(option, itemDb) {
  const extracted = extractEquipItems(option?.node);
  return { items: resolveEquipmentItems(extracted, itemDb), coins: cpToCoins(extracted.cp) };
}

function shiftCoins(currency, coins, sign) {
  const next = { ...currency };
  Object.entries(coins || {}).forEach(([coin, value]) => {
    next[coin] = Math.max(0, normalizeCoinAmount(next[coin]) + sign * normalizeCoinAmount(value));
  });
  return next;
}

// Gear-type slot picks live under `<keyBase>__et<n>`.
function takeBackSlotPicks(patch, keyBase) {
  let { inventory } = patch;
  const equipChoices = { ...patch.equipChoices };
  Object.entries(equipChoices).forEach(([slotKey, ref]) => {
    if (!slotKey.startsWith(`${keyBase}__et`)) return;
    if (ref) inventory = removeOneByRef(inventory, ref);
    delete equipChoices[slotKey];
  });
  return { ...patch, inventory, equipChoices };
}

function takeBackPick(patch, block, itemDb) {
  const picked = patch.equipChoices[block.key];
  const option = picked && block.options.find((opt) => opt.value === picked);
  if (!option) return patch;
  const grant = optionGrant(option, itemDb);
  return takeBackSlotPicks({
    inventory: removeInventoryEntries(patch.inventory, grant.items, itemDb),
    currency: shiftCoins(patch.currency, grant.coins, -1),
    equipChoices: { ...patch.equipChoices, [block.key]: null },
  }, `${block.key}_${picked}`);
}

function startPatch(character) {
  return {
    inventory: character.inventory || [],
    currency: character.currency || {},
    equipChoices: character.equipChoices || {},
  };
}

// Pick `value` in a choice block: the previous pick is taken back, then the
// option's items and coins are added. Picking the chosen option again only
// takes it back.
export function chooseStartingEquipment(character, block, value, itemDb) {
  const again = character.equipChoices?.[block.key] === value;
  const patch = takeBackPick(startPatch(character), block, itemDb);
  if (again) return patch;
  const option = block.options.find((opt) => opt.value === value);
  if (!option) return patch;
  const grant = optionGrant(option, itemDb);
  return {
    inventory: addInventoryEntries(patch.inventory, grant.items, itemDb),
    currency: shiftCoins(patch.currency, grant.coins, 1),
    equipChoices: { ...patch.equipChoices, [block.key]: value },
  };
}

// Every pick of one source (`cls` or `bg`) taken back, for a new class or
// background. Picks whose option can no longer be read just go.
export function clearStartingEquipment(character, eq, prefix, itemDb) {
  let patch = startPatch(character);
  collectChoiceBlocks(eq, prefix).forEach((block) => { patch = takeBackPick(patch, block, itemDb); });
  patch = takeBackSlotPicks(patch, prefix);
  const equipChoices = { ...patch.equipChoices };
  Object.keys(equipChoices).forEach((key) => { if (key.startsWith(`${prefix}_`)) delete equipChoices[key]; });
  return { ...patch, equipChoices };
}
