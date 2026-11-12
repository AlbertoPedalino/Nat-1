/**
 * 5e 2024 armor training penalties.
 *
 * XPHB armor rules:
 * - Light/Medium/Heavy without training: Disadvantage on any Strength/Dexterity D20 Test, and can't cast spells.
 * - Shield without training: no Shield AC bonus.
 * - Armor Strength requirement: speed -10 ft unless STR meets requirement.
 * - Heavy armor always gives Stealth disadvantage. Other armor can also set it via the armor table property.
 */

import { getArmorTrainingInfo } from '../../../shared/character/proficiency/proficiencyQueries.js';
import { requireEquipmentSets } from '../../../shared/character/proficiency/equipmentSets.js';
import { itemEffectInventory } from '../../../shared/character/forms/wildShapeForm.js';
import { getFinal } from '../../../shared/character/sheet/sheetStats.js';
import { isArmorOrShield, isBodyArmor, isHeavyArmor, isShield } from '../../../shared/character/inventory/itemKinds.js';

export function getArmorPenalties(C, item, equipmentSets) {
  if (!item || !isArmorOrShield(item)) {
    return { hasPenalty: false, penalties: [], cannotCastSpells: false };
  }
  const sets = requireEquipmentSets(equipmentSets, 'getArmorPenalties');

  const penalties = [];
  const info = getArmorTrainingInfo(C, item, null, sets);
  const { trained, kind } = info;

  if (!trained && isBodyArmor(item)) {
    penalties.push(
      { type: 'disadvantage', applies: ['str-checks', 'str-saves', 'dex-checks', 'dex-saves'], reason: `No ${kind} Training` },
      { type: 'no-spellcasting', reason: `No ${kind} Training` },
    );
  }

  if (!trained && isShield(item)) {
    penalties.push({ type: 'no-shield-ac', amount: -2, reason: 'No Shield Training' });
  }

  if (isHeavyArmor(item) || item.stealth) {
    penalties.push({ type: 'disadvantage', applies: ['dex-stealth'], reason: isHeavyArmor(item) ? 'Heavy Armor Stealth Disadvantage' : 'Armor Stealth Disadvantage' });
  }

  const requiredStrength = Number(item.strength || 0);
  if (requiredStrength > 0 && getFinal(C, 'str') < requiredStrength) {
    penalties.push({ type: 'speed-penalty', amount: -10, reason: `Requires STR ${requiredStrength}` });
  }

  return {
    hasPenalty: penalties.length > 0,
    penalties,
    cannotCastSpells: penalties.some(p => p.type === 'no-spellcasting'),
  };
}

export function getEquippedArmorPenalties(C, inventory, equipmentSets) {
  const sets = requireEquipmentSets(equipmentSets, 'getEquippedArmorPenalties');
  // Wild Shape: the armor merges into the form, so it imposes nothing.
  const equippedArmor = itemEffectInventory(C, inventory)
    .filter(item => item.equipped && isArmorOrShield(item));

  const allPenalties = equippedArmor
    .flatMap(item => {
      const { hasPenalty, penalties } = getArmorPenalties(C, item, sets);
      return hasPenalty ? penalties.map(p => ({ ...p, item: item.name })) : [];
    });

  // Aggregate penalties
  const result = {
    hasPenalty: allPenalties.length > 0,
    disadvantageOn: new Set(),
    speedPenalty: 0,
    acPenalty: 0,
    cannotCastSpells: false,
    noShieldAc: false,
    details: allPenalties,
  };

  allPenalties.forEach(penalty => {
    if (penalty.type === 'disadvantage') {
      penalty.applies.forEach(app => result.disadvantageOn.add(app));
    } else if (penalty.type === 'speed-penalty') {
      result.speedPenalty = Math.min(result.speedPenalty, penalty.amount);
    } else if (penalty.type === 'no-shield-ac') {
      result.noShieldAc = true;
      result.acPenalty += penalty.amount;
    } else if (penalty.type === 'no-spellcasting') {
      result.cannotCastSpells = true;
    }
  });

  result.disadvantageOn = Array.from(result.disadvantageOn);
  return result;
}

