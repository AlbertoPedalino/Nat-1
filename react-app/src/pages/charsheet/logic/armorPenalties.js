/**
 * 5e 2024 armor training penalties.
 *
 * XPHB armor rules:
 * - Light/Medium/Heavy without training: Disadvantage on any Strength/Dexterity D20 Test, and can't cast spells.
 * - Shield without training: no Shield AC bonus.
 * - Armor Strength requirement: speed -10 ft unless STR meets requirement.
 * - Heavy armor always gives Stealth disadvantage. Other armor can also set it via the armor table property.
 */

import { getArmorTrainingInfo } from './proficiencies.js';
import { getFinal } from './calculations.js';

function requireSets(sets, fnName) {
  if (!sets) {
    throw new Error(`${fnName} requires equipmentSets from collectEquipmentProficiencySets(character)`);
  }
  return sets;
}

export function getArmorPenalties(C, item, equipmentSets) {
  if (!item || !['LA', 'MA', 'HA', 'S'].includes(item.type)) {
    return { hasPenalty: false, penalties: [], cannotCastSpells: false };
  }
  const sets = requireSets(equipmentSets, 'getArmorPenalties');

  const penalties = [];
  const info = getArmorTrainingInfo(C, item, null, sets);
  const { trained, kind } = info;

  if (!trained && ['LA', 'MA', 'HA'].includes(item.type)) {
    penalties.push(
      { type: 'disadvantage', applies: ['str-checks', 'str-saves', 'dex-checks', 'dex-saves'], reason: `No ${kind} Training` },
      { type: 'no-spellcasting', reason: `No ${kind} Training` },
    );
  }

  if (!trained && item.type === 'S') {
    penalties.push({ type: 'no-shield-ac', amount: -2, reason: 'No Shield Training' });
  }

  if (item.type === 'HA' || item.stealth) {
    penalties.push({ type: 'disadvantage', applies: ['dex-stealth'], reason: item.type === 'HA' ? 'Heavy Armor Stealth Disadvantage' : 'Armor Stealth Disadvantage' });
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
  const sets = requireSets(equipmentSets, 'getEquippedArmorPenalties');
  const equippedArmor = (inventory || [])
    .filter(item => item.equipped && ['LA', 'MA', 'HA', 'S'].includes(item.type));

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

export function formatArmorPenaltyMessage(penalties) {
  if (!penalties.hasPenalty) return '';
  
  const parts = [];
  
  if (penalties.disadvantageOn.length > 0) {
    const stealth = penalties.disadvantageOn.includes('dex-stealth');
    const checks = penalties.disadvantageOn.filter(x => x.includes('checks')).map(x => x.split('-')[0].toUpperCase()).join('/');
    const saves = penalties.disadvantageOn.filter(x => x.includes('saves')).map(x => x.split('-')[0].toUpperCase()).join('/');
    if (stealth) parts.push('Disadvantage on Stealth');
    if (checks) parts.push(`Disadvantage on ${checks} checks`);
    if (saves && saves !== checks) parts.push(`Disadvantage on ${saves} saves`);
  }
  
  if (penalties.speedPenalty < 0) {
    parts.push(`Speed -${Math.abs(penalties.speedPenalty)} ft`);
  }
  
  if (penalties.acPenalty < 0) {
    parts.push(`Shield AC ${penalties.acPenalty}`);
  }

  if (penalties.cannotCastSpells) {
    parts.push("Can't cast spells");
  }
  
  return parts.join(' • ');
}

export function getArmorAC(item) {
  if (!item) return 0;
  if (item.type === 'LA') return item.ac || 10;
  if (item.type === 'MA') return item.ac || 12;
  if (item.type === 'HA') return item.ac || 14;
  return 0;
}
