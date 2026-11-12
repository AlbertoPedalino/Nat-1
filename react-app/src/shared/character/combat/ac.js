import { getAcBonusEffects } from '../sheet/effectBonuses.js';
import { collectSheetEffects } from '../sheet/sheetEffects.js';
import { wildShapeArmorClass } from '../forms/wildShapeForm.js';
import { finalAbilityModifier } from '../progression/abilityScores.js';
import { aggregateMiscAcBonus, armorEnhancement } from '../inventory/itemBonus.js';
import { matchKey } from '../../content/nameKeys.js';
import { wildShapeArmorClassWithRules } from '../forms/wildShapeRules.js';
import { isBodyArmor, isShield, itemBaseType } from '../inventory/itemKinds.js';

// The alternate AC formulas in force (Unarmored Defense, Draconic Resilience…):
// sheet effects of type `acFormula`, gated like every other effect
// (collectSheetEffects), one per key.
export function collectAcFormulas(character) {
  if (!character?.className) return [];
  const seen = new Set();
  return collectSheetEffects(character).flatMap((effect) => {
    const type = String(effect.type || '');
    if (type !== 'acFormula' && type !== 'unarmoredDefense') return [];
    const key = matchKey(effect.key || `${effect.sourceKey}_${type}_${(effect.abilities || []).join('_')}`);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      ...effect,
      type: 'acFormula',
      key,
      label: effect.label || effect.note || 'Alternate AC',
      base: Number(effect.base) || 10,
      abilities: effect.abilities || ['dex'],
      allowShield: effect.allowShield !== false,
      requiresNoArmor: effect.requiresNoArmor !== false,
      minLevel: Number(effect.minLevel || 1),
    }];
  });
}

export function getEquippedArmor(character, items) {
  return (items || []).find((i) => i.equipped && isBodyArmor(i));
}

export function getEquippedShield(character, items) {
  return (items || []).find((i) => i.equipped && isShield(i));
}

export function computeArmorItemAc(character, items) {
  const armor = getEquippedArmor(character, items);
  if (!armor) return null;
  const dex = finalAbilityModifier(character, 'dex');
  const base = (Number(armor.ac) || 10) + armorEnhancement(armor);
  const kind = itemBaseType(armor);
  if (kind === 'LA') return { value: base + dex, source: armor.name || 'Light Armor', label: 'Light Armor' };
  if (kind === 'MA') return { value: base + Math.min(2, dex), source: armor.name || 'Medium Armor', label: 'Medium Armor' };
  if (kind === 'HA') return { value: base, source: armor.name || 'Heavy Armor', label: 'Heavy Armor' };
  return null;
}

export function computeAcFormulaValue(character, formula) {
  if (!formula) return null;
  const mods = (formula.abilities || ['dex']).map((a) => finalAbilityModifier(character, a));
  return (formula.base || 10) + mods.reduce((s, m) => s + m, 0);
}

export function computeBestArmorClass(character, items, shieldTrained) {
  const beastAc = wildShapeArmorClassWithRules(character, wildShapeArmorClass(character));
  if (beastAc) return beastAc;
  const shield = getEquippedShield(character, items);
  const hasShield = !!shield;
  const shieldBonus = hasShield && shieldTrained !== false ? 2 + armorEnhancement(shield) : 0;
  const miscAcBonus = aggregateMiscAcBonus(items);
  const candidates = [];

  const armorAc = computeArmorItemAc(character, items);
  if (armorAc) {
    candidates.push({
      value: armorAc.value + shieldBonus,
      source: armorAc.source,
      label: `AC (${armorAc.label}${hasShield ? ' + Shield' : ''})`,
      formulaLabel: armorAc.label,
      shieldApplied: hasShield,
      shieldBonus,
      sourceType: 'armor',
    });
  }

  const formulas = collectAcFormulas(character);
  formulas.forEach((f) => {
    if (f.requiresNoArmor && getEquippedArmor(character, items)) return;
    if (!f.allowShield && hasShield) return;
    const baseValue = computeAcFormulaValue(character, f);
    candidates.push({
      value: baseValue + shieldBonus,
      source: f.label,
      label: `AC (${f.label}${hasShield ? ' + Shield' : ''})`,
      formulaLabel: f.label,
      shieldApplied: hasShield && f.allowShield,
      shieldBonus: hasShield && f.allowShield ? shieldBonus : 0,
      sourceType: 'formula',
    });
  });

  const dexMod = finalAbilityModifier(character, 'dex');
  candidates.push({
    value: 10 + dexMod + shieldBonus,
    source: 'Base AC',
    label: `AC (Base${hasShield ? ' + Shield' : ''})`,
    formulaLabel: '10 + DEX',
    shieldApplied: hasShield,
    shieldBonus,
    sourceType: 'base',
  });

  const wearingArmor = !!getEquippedArmor(character, items);
  const acBonus = getAcBonusEffects(character, { wearingArmor }) + miscAcBonus;
  if (acBonus > 0) {
    candidates.forEach(c => c.value += acBonus);
  }

  candidates.sort((a, b) => b.value - a.value);
  return candidates[0] || { value: 10 + acBonus, source: 'Base AC', label: 'AC (Base)', formulaLabel: '10', shieldApplied: false, shieldBonus: 0, sourceType: 'base' };
}

