import { installedRegistry } from '../../adapters/index.js';
import { getAcBonusEffects } from '../../pages/charsheet/logic/sheetEffects.js';

function asArray(value) {
  return Array.isArray(value) ? value : (value == null ? [] : [value]);
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function statMod(score) {
  return Math.floor((Number(score || 0) - 10) / 2);
}

function getAbilityMod(character, ability) {
  const score = character?.finalScores?.[ability];
  if (score != null) return statMod(score);
  return 0;
}

function ownerLevelOf(character, className, isPrimary) {
  if (isPrimary) return Number(character?.classLevel || character?.level || 1);
  const found = (character?.extraClasses || []).find((e) => norm(e?.name) === norm(className));
  return Number(found?.level || 1);
}

function collectFromSheetEffects(out, list, meta, character, seenKeys) {
  asArray(list).forEach((effect) => {
    if (!effect || typeof effect !== 'object') return;
    const type = String(effect.type || '');
    if (type !== 'acFormula' && type !== 'unarmoredDefense') return;
    const minLevel = Number(effect.minLevel || 1);
    if (Number(meta.ownerLevel || 1) < minLevel) return;
    const rawKey = effect.key || `${meta.sourceKey}_${type}_${(effect.abilities || []).join('_')}`;
    const key = norm(rawKey);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    out.push({
      ...effect,
      type: 'acFormula',
      key,
      label: effect.label || effect.note || 'Alternate AC',
      base: Number(effect.base) || 10,
      abilities: effect.abilities || ['dex'],
      allowShield: effect.allowShield !== false,
      requiresNoArmor: effect.requiresNoArmor !== false,
      minLevel: Number(effect.minLevel || 1),
      ownerName: meta.ownerName,
      ownerType: meta.ownerType,
      sourceKey: meta.sourceKey,
    });
  });
}

function collectRuntimeConfigFormulas(out, character, seenKeys) {
  const entities = [
    { className: character.className, subclassShortName: character.subclassShortName, isPrimary: true },
    ...(character.extraClasses || []).map((e) => ({ className: e.name, subclassShortName: e.subclassShortName, isPrimary: false })),
  ].filter((e) => e.className);

  entities.forEach((entity) => {
    const ol = ownerLevelOf(character, entity.className, entity.isPrimary);

    const clsCfg = installedRegistry.getClassRuntimeConfig(entity.className);
    if (clsCfg?.unarmoredDefense) {
      asArray(clsCfg.unarmoredDefense).forEach((cfg) => {
        if (ol < Number(cfg.minLevel || 1)) return;
        const key = norm(`${entity.className}_unarmored_defense`);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        out.push({
          type: 'acFormula',
          key,
          label: cfg.name || 'Unarmored Defense',
          base: Number(cfg.base) || 10,
          abilities: cfg.abilities || ['dex'],
          allowShield: cfg.allowShield !== false,
          requiresNoArmor: true,
          minLevel: Number(cfg.minLevel || 1),
          ownerName: entity.className,
          ownerType: 'class',
          sourceKey: `${entity.className}_runtime`,
        });
      });
    }

    if (entity.subclassShortName) {
      const subCfg = installedRegistry.getSubclassRuntimeConfig(entity.className, entity.subclassShortName);
      if (subCfg?.unarmoredDefense) {
        asArray(subCfg.unarmoredDefense).forEach((cfg) => {
          if (ol < Number(cfg.minLevel || 1)) return;
          const key = norm(`${entity.className}_${entity.subclassShortName}_${cfg.name || 'unarmored_defense'}`);
          if (seenKeys.has(key)) return;
          seenKeys.add(key);
          out.push({
            type: 'acFormula',
            key,
            label: cfg.name || 'Unarmored Defense',
            base: Number(cfg.base) || 10,
            abilities: cfg.abilities || ['dex'],
            allowShield: cfg.allowShield !== false,
            requiresNoArmor: true,
            minLevel: Number(cfg.minLevel || 1),
            ownerName: entity.subclassShortName,
            ownerType: 'subclass',
            sourceKey: `${entity.className}_${entity.subclassShortName}_runtime`,
          });
        });
      }
    }
  });
}

export function collectAcFormulas(character) {
  if (!character?.className) return [];
  const out = [];
  const seenKeys = new Set();

  const entities = [
    { className: character.className, subclassShortName: character.subclassShortName, isPrimary: true },
    ...(character.extraClasses || []).map((e) => ({ className: e.name, subclassShortName: e.subclassShortName, isPrimary: false })),
  ].filter((e) => e.className);

  entities.forEach((entity) => {
    const ol = ownerLevelOf(character, entity.className, entity.isPrimary);
    collectFromSheetEffects(out, installedRegistry.getClassSheetEffects(entity.className), {
      ownerName: entity.className, ownerType: 'class', ownerLevel: ol, sourceKey: entity.className,
    }, character, seenKeys);
    if (entity.subclassShortName) {
      collectFromSheetEffects(out, installedRegistry.getSubclassSheetEffects(entity.className, entity.subclassShortName), {
        ownerName: entity.subclassShortName, ownerType: 'subclass', ownerLevel: ol, sourceKey: `${entity.className}_${entity.subclassShortName}`,
      }, character, seenKeys);
    }
  });

  if (character.speciesName) {
    collectFromSheetEffects(out, installedRegistry.getSpeciesSheetEffects(character.speciesName, character.speciesSource), {
      ownerName: character.speciesName, ownerType: 'species', ownerLevel: Number(character.level || 1), sourceKey: character.speciesName,
    }, character, seenKeys);
  }

  collectRuntimeConfigFormulas(out, character, seenKeys);

  return out;
}

export function getEquippedArmor(character, items) {
  return (items || []).find((i) => i.equipped && ['LA', 'MA', 'HA'].includes(i.type));
}

export function getEquippedShield(character, items) {
  return (items || []).find((i) => i.equipped && i.type === 'S');
}

import { aggregateMiscAcBonus, armorEnhancement } from './itemBonus.js';

export function computeArmorItemAc(character, items) {
  const armor = getEquippedArmor(character, items);
  if (!armor) return null;
  const dex = getAbilityMod(character, 'dex');
  const base = (Number(armor.ac) || 10) + armorEnhancement(armor);
  if (armor.type === 'LA') return { value: base + dex, source: armor.name || 'Light Armor', label: 'Light Armor' };
  if (armor.type === 'MA') return { value: base + Math.min(2, dex), source: armor.name || 'Medium Armor', label: 'Medium Armor' };
  if (armor.type === 'HA') return { value: base, source: armor.name || 'Heavy Armor', label: 'Heavy Armor' };
  return null;
}

export function computeAcFormulaValue(character, formula) {
  if (!formula) return null;
  const mods = (formula.abilities || ['dex']).map((a) => getAbilityMod(character, a));
  return (formula.base || 10) + mods.reduce((s, m) => s + m, 0);
}

export function computeBestArmorClass(character, items, shieldTrained) {
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

  const dexMod = getAbilityMod(character, 'dex');
  candidates.push({
    value: 10 + dexMod + shieldBonus,
    source: 'Base AC',
    label: `AC (Base${hasShield ? ' + Shield' : ''})`,
    formulaLabel: '10 + DEX',
    shieldApplied: hasShield,
    shieldBonus,
    sourceType: 'base',
  });

  const acBonus = getAcBonusEffects(character) + miscAcBonus;
  if (acBonus > 0) {
    candidates.forEach(c => c.value += acBonus);
  }

  candidates.sort((a, b) => b.value - a.value);
  return candidates[0] || { value: 10 + acBonus, source: 'Base AC', label: 'AC (Base)', formulaLabel: '10', shieldApplied: false, shieldBonus: 0, sourceType: 'base' };
}

export function explainArmorClass(character, items, shieldTrained) {
  const best = computeBestArmorClass(character, items, shieldTrained);
  const shield = getEquippedShield(character, items);
  const hasShield = !!shield;
  const shieldBonus = hasShield && shieldTrained !== false ? 2 : 0;

  const formulas = collectAcFormulas(character).filter((f) => {
    if (f.requiresNoArmor && getEquippedArmor(character, items)) return false;
    if (!f.allowShield && hasShield) return false;
    return true;
  });

  return {
    value: best.value,
    source: best.source,
    sourceType: best.sourceType,
    label: best.label,
    formulaLabel: best.formulaLabel,
    shieldApplied: best.shieldApplied,
    shieldBonus: best.shieldBonus,
    armorAc: computeArmorItemAc(character, items),
    availableFormulas: formulas.map((f) => ({
      key: f.key,
      label: f.label,
      value: computeAcFormulaValue(character, f),
      abilities: f.abilities,
      allowShield: f.allowShield,
    })),
  };
}
