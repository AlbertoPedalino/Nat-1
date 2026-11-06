import { asArray } from '../../../shared/lists.js';
import {
  cleanText,
  norm,
  displayLabel,
  inferDamageTypeFromText,
  resolveChoiceValue,
  collectSheetEffects,
  effectTitle,
  effectSummary,
} from './sheetEffects.js';

// Damage resistances and immunities as the sheet and the builder preview show
// them: the species' and other static defense blocks, the choices that pick a
// resistance, and those granted by active sheet effects, deduplicated.

function splitDefenseText(value) {
  return cleanText(value)
    .split(/[;,/]/)
    .map((item) => displayLabel(item))
    .filter(Boolean);
}

function defenseItemsFromBlock(block, kind, source) {
  const out = [];

  const push = (label) => {
    const text = displayLabel(label);
    if (!text) return;
    out.push({ label: text, kind, source });
  };

  if (block == null) return out;

  if (typeof block === 'string') {
    splitDefenseText(block).forEach(push);
    return out;
  }

  if (Array.isArray(block)) {
    block.forEach((entry) => out.push(...defenseItemsFromBlock(entry, kind, source)));
    return out;
  }

  if (typeof block === 'object') {
    if (block.special) push(block.special);
    if (block.note) push(block.note);

    if (block.resist) out.push(...defenseItemsFromBlock(block.resist, 'Resistance', source));
    if (block.immune) out.push(...defenseItemsFromBlock(block.immune, 'Immunity', source));
    if (block.vulnerable) out.push(...defenseItemsFromBlock(block.vulnerable, 'Vulnerability', source));

    // Important: `choose.from` means "pick one", not "gain all".
    // The selected value is read separately from character.choices / normalized choices.
    // Do not expand all possible choices here, otherwise Dragonborn appears resistant
    // to Acid, Cold, Fire, Lightning, and Poison at the same time.
    Object.entries(block).forEach(([key, value]) => {
      if (['choose', 'special', 'note', 'resist', 'immune', 'vulnerable'].includes(key)) return;
      if (value === true) push(key);
      else if (typeof value === 'string') push(value);
      else if (Array.isArray(value)) value.forEach((entry) => push(entry));
    });
  }

  return out;
}

function collectSelectedSpeciesResistanceChoices(character = {}, source = 'Species') {
  const out = [];

  const pushMaybeDamageType = (value) => {
    const raw = displayLabel(value);
    const damageType = inferDamageTypeFromText(raw);
    if (damageType) out.push({ label: damageType, kind: 'Resistance', source });
  };

  const speciesChoiceCanGrantResistance = (key) => {
    const k = norm(String(key).replace(/^mc\d+_/, ''));
    if (!k.startsWith('species')) return false;
    return k.includes('resist') || k.includes('resistance');
  };

  Object.entries(character.choices || {}).forEach(([key, value]) => {
    if (!speciesChoiceCanGrantResistance(key)) return;
    asArray(value).forEach((entry) => pushMaybeDamageType(entry, key));
  });

  const normalized = character.normalizedChoices || {};
  [
    normalized.species?.options,
    normalized.speciesOptions,
    normalized.rawByKey,
  ].forEach((bucket) => {
    if (!bucket || typeof bucket !== 'object') return;
    Object.entries(bucket).forEach(([key, value]) => {
      if (!speciesChoiceCanGrantResistance(key)) return;
      asArray(value).forEach((entry) => pushMaybeDamageType(entry, key));
    });
  });

  return dedupeDefenseItems(out);
}

function collectStaticDefenseItems(character = {}) {
  const species = character.speciesSnapshot || character.speciesObj || {};
  const cls = character.clsSnapshot || character.cls || {};
  const bg = character.backgroundSnapshot || character.backgroundObj || {};

  const groups = [
    { source: species.name || character.speciesName || 'Species', data: species },
    { source: cls.name || character.className || 'Class', data: cls },
    { source: bg.name || character.backgroundName || 'Background', data: bg },
  ];

  const out = [];
  groups.forEach(({ source, data }) => {
    out.push(...defenseItemsFromBlock(data.resist, 'Resistance', source));
    out.push(...defenseItemsFromBlock(data.immune, 'Immunity', source));
    out.push(...defenseItemsFromBlock(data.vulnerable, 'Vulnerability', source));
    out.push(...defenseItemsFromBlock(data.conditionImmune, 'Immunity', source));
  });

  out.push(...collectSelectedSpeciesResistanceChoices(character, species.name || character.speciesName || 'Species'));

  return dedupeDefenseItems(out);
}

function resistanceItemsFromEffects(character = {}) {
  return collectSheetEffects(character)
    .filter((effect) => norm(effect.type).includes('resistance'))
    .flatMap((effect) => {
      const summary = effectSummary(effect, character);
      const fromSummary = summary
        .split('•')[0]
        .trim()
        .replace(/\s+Resistance.*$/i, '');

      const labels = [];
      if (fromSummary && !/^choose$/i.test(fromSummary)) labels.push(fromSummary);
      asArray(effect.damageTypes).forEach((type) => labels.push(cleanText(type)));

      return labels
        .map((label) => displayLabel(label))
        .filter(Boolean)
        .map((label) => ({
          label,
          kind: 'Resistance',
          source: effect.ownerName || '',
          note: cleanText(effect.note || ''),
        }));
    });
}

function immunityItemsFromEffects(character = {}) {
  return collectSheetEffects(character)
    .filter((effect) => norm(effect.type).includes('immunity'))
    .flatMap((effect) => {
      const labels = [];

      if (norm(effect.type).includes('immunitychoice')) {
        const resolved = resolveChoiceValue(effect, character);
        if (resolved && !/^choose$/i.test(resolved)) labels.push(resolved);
      } else {
        labels.push(...asArray(effect.conditions).map(cleanText));
        labels.push(...asArray(effect.damageTypes).map(cleanText));
        if (effect.value != null) labels.push(cleanText(effect.value));
      }

      if (!labels.length) {
        const fallback = effectSummary(effect, character).split('•')[0].trim() || effectTitle(effect);
        if (fallback && !/^choose$/i.test(fallback)) labels.push(fallback);
      }

      return labels
        .map((label) => displayLabel(label))
        .filter(Boolean)
        .map((label) => ({
          label,
          kind: 'Immunity',
          source: effect.ownerName || '',
          note: cleanText(effect.note || ''),
        }));
    });
}

function dedupeDefenseItems(items) {
  const byKey = new Map();
  items.forEach((item) => {
    const label = displayLabel(item.label);
    if (!label) return;
    const key = `${norm(item.kind)}|${norm(label)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...item, label });
      return;
    }
    if (!existing.source && item.source) byKey.set(key, { ...item, label });
  });
  return [...byKey.values()].sort((a, b) => (
    String(a.kind).localeCompare(String(b.kind)) || String(a.label).localeCompare(String(b.label))
  ));
}

export function collectResolvedResistanceItems(character = {}) {
  const staticItems = collectStaticDefenseItems(character).filter((item) => item.kind === 'Resistance');
  return dedupeDefenseItems([...staticItems, ...resistanceItemsFromEffects(character)]);
}

export function collectResolvedImmunityItems(character = {}) {
  const staticItems = collectStaticDefenseItems(character).filter((item) => item.kind === 'Immunity');
  return dedupeDefenseItems([...staticItems, ...immunityItemsFromEffects(character)]);
}

export function collectPreviewDefenseSections(character = {}) {
  const resistanceItems = collectResolvedResistanceItems(character)
    .map((item) => `${displayLabel(item.label)}${item.source ? ` (${item.source})` : ''}`);
  const immunityItems = collectResolvedImmunityItems(character)
    .map((item) => `${displayLabel(item.label)}${item.source ? ` (${item.source})` : ''}`);

  return [
    resistanceItems.length ? { title: 'Resistances', items: resistanceItems } : null,
    immunityItems.length ? { title: 'Immunities', items: immunityItems } : null,
  ].filter(Boolean);
}
