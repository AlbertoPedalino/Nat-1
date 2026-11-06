import { withModifier } from '../../../shared/ui/numberFormat.js';

// Spell row details: flat bonuses folded into a damage formula, and the
// cantrip modifier notes grouped for display.

export function applyFlatToFormula(formula, flat) {
  if (!formula) return formula;
  if (!flat) return formula;
  const text = String(formula).replace(/\s+/g, '');
  const match = text.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return formula;
  const count = Number(match[1]);
  const faces = Number(match[2]);
  const total = Number(match[3] || 0) + Number(flat || 0);
  return withModifier(`${count}d${faces}`, total);
}

export function normalizeModifierDetails(cantripData) {
  const raw = [
    ...(Array.isArray(cantripData?.grantModifiers) ? cantripData.grantModifiers : []),
    ...(Array.isArray(cantripData?.modifiers) ? cantripData.modifiers : []),
    ...(Array.isArray(cantripData?.cantripModifiers) ? cantripData.cantripModifiers : []),
    ...(Array.isArray(cantripData?.extraDetails) ? cantripData.extraDetails : []),
  ];
  const seen = new Set();
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      key: item.key || item.label || item.tagLabel || item.detailTitle || null,
      label: item.label || null,
      tagLabel: item.tagLabel || item.label || null,
      detailGroupLabel: item.detailGroupLabel || item.groupLabel || null,
      detailTitle: item.detailTitle || item.tagLabel || item.label || null,
      detailText: item.detailText || item.description || null,
      description: item.description || item.detailText || null,
    }))
    .filter((item) => {
      const dedupeKey = item.key || item.label || item.tagLabel || item.detailTitle;
      if (!dedupeKey || seen.has(dedupeKey)) return false;
      if (!item.detailText && !item.description) return false;
      seen.add(dedupeKey);
      return true;
    });
}

export function groupModifierDetails(details) {
  const groups = new Map();
  details.forEach((item) => {
    const label = item.detailGroupLabel || 'Modifier Details';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  });
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}
