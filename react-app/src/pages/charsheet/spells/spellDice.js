import { withModifier } from '../../../shared/ui/numberFormat.js';

// Dice formulas of spell rows: upcast steps, scaled formulas, cantrip damage
// by character level, the damage dice found in a spell's text, and signed
// bonuses for display.

function parseDice(formula) {
  const match = String(formula).match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
  if (!match) return null;
  return { count: parseInt(match[1]), faces: parseInt(match[2]), mod: match[3] ? parseInt(match[3]) : 0 };
}

function formatDice(count, faces, mod) {
  return withModifier(`${count}d${faces}`, mod);
}

export function computeScaledFormula(baseFormula, stepFormula, steps) {
  const b = parseDice(baseFormula);
  const s = parseDice(stepFormula);
  if (!b || !s) return baseFormula;
  return formatDice(b.count + s.count * steps, b.faces, b.mod);
}

export function getUpcastStep(entries) {
  if (!entries) return null;
  const text = JSON.stringify(entries);
  const m = text.match(/\{@scaled(?:amage|ice)\s+(\d+d\d+)\|(\d+-\d+)\|(\d+d\d+)\}/);
  if (m) return { stepDie: m[3], range: m[2], display: m[1] };
  const m2 = text.match(/\{@scaled(?:amage|ice)\s+(\d+d\d+)\|(\d+-\d+)\}/);
  if (m2) return { stepDie: m2[1], range: m2[2], display: m2[1] };
  return null;
}

// A cantrip's dice at a character level, from 5etools' `scalingLevelDice`
// ({ scaling: { 5: '1d6', 11: '2d6', 17: '3d6' } }): the highest step reached,
// or '' before the first (True Strike's extra Radiant damage starts at 5).
export function cantripScalingDice(scalingLevelDice, level) {
  const first = Array.isArray(scalingLevelDice) ? scalingLevelDice[0] : scalingLevelDice;
  const steps = Object.entries(first?.scaling || {})
    .map(([at, dice]) => [Number(at), String(dice || '')])
    .filter(([at, dice]) => Number.isFinite(at) && dice && at <= Number(level || 0))
    .sort((a, b) => b[0] - a[0]);
  return steps[0]?.[1] || '';
}

// A cantrip's damage rolls at a character level, one per `scalingLevelDice`
// line (Toll the Dead has two), titled with 5etools' own label. The text only
// names the level-1 dice, so the dice are read from here rather than from the
// description.
export function cantripScalingDamages(scalingLevelDice, level) {
  const lines = Array.isArray(scalingLevelDice) ? scalingLevelDice : (scalingLevelDice ? [scalingLevelDice] : []);
  return lines.flatMap((line) => {
    const dice = cantripScalingDice(line, level).replace(/\s+/g, '');
    if (!/^\d+d\d+$/i.test(dice)) return [];
    const label = String(line?.label || '').trim();
    return [{ formula: dice, label: dice, title: label ? label[0].toUpperCase() + label.slice(1) : '' }];
  });
}

export function extractDamageDice(entries) {
  const out = [];
  const seen = new Set();
  const walk = (node) => {
    if (!node) return;
    if (typeof node === 'string') {
      node.replace(/\{@damage ([^}]+)\}/g, (_, inner) => {
        const formula = inner.trim().replace(/\s+/g, '');
        if (!seen.has(formula)) { seen.add(formula); out.push({ formula, label: formula }); }
        return '';
      });
      return;
    }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  };
  walk(entries);
  return out;
}

