import { expect, test } from 'vitest';
import { getEquippedArmorPenalties } from '../../../../../src/pages/charsheet/inventory/armorPenalties.js';
import { collectEquipmentProficiencySets } from '../../../../../src/shared/character/proficiency/equipmentSets.js';

// Worn armor merges into a Wild Shape form like every other piece of
// equipment: it imposes nothing, wherever the sheet asks (checks, saves,
// speed, spellcasting).
const plate = { name: 'Plate Armor', type: 'HA', strength: 15, equipped: true };
const druid = { name: 'Druid', inventory: [plate] };
const wolf = { ...druid, wildShape: { beast: { name: 'Wolf', abilities: { str: 12, dex: 15, con: 12 } } } };

test('heavy armor without training penalises your own form, not the beast', () => {
  const own = getEquippedArmorPenalties(druid, druid.inventory, collectEquipmentProficiencySets(druid));
  expect(own.hasPenalty).toBe(true);
  expect(own.disadvantageOn).toContain('dex-stealth');
  const shaped = getEquippedArmorPenalties(wolf, wolf.inventory, collectEquipmentProficiencySets(wolf));
  expect(shaped.hasPenalty).toBe(false);
  expect(shaped.disadvantageOn).toEqual([]);
});
