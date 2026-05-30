// Single source of truth for the Senses panel's vision/sense rows.
//
// Model: every vision source (species, magic item, class/subclass/feat sheet
// effect) is normalized to one entry { type, range, source, additive }, then
// entries are grouped by sense `type`.
//
//   - Same type from many sources  → collapsed to the highest effective range,
//     tagged with the source that wins (e.g. Darkvision 60 + 120 → "120 ft").
//   - Different types               → separate rows, each with its own source
//     (e.g. Darkvision 60 ft + Devil's Sight 120 ft → two rows).
//
// `additive` sources add to the type's non-additive base (e.g. Umbral Sight /
// Shadow Arts: "Darkvision 60 ft, or +60 ft if you already have it").
//
// Adding a new sense from any adapter = register a sheet effect
// `{ type:'sense', senseType:'<type>', value:<ft>, additive?:bool, note }`;
// nothing in this file changes. A brand-new vision *domain* = one collector
// spread into collectVisionEntries.

import { collectSenseEffects } from './sheetEffects.js';
import { getItemSenses } from '../../../shared/character/itemEffects.js';

export const SENSE_LABELS = {
  darkvision: 'Darkvision',
  devilsSight: "Devil's Sight",
  blindsight: 'Blindsight',
  truesight: 'Truesight',
  tremorsense: 'Tremorsense',
  telepathy: 'Telepathy',
};

function senseLabel(type) {
  return SENSE_LABELS[type] || String(type || '').replace(/^\w/, (c) => c.toUpperCase());
}

// Canonical sense type for an effect: explicit senseType wins, else the effect
// type itself (e.g. Shadow Arts registers `type: 'darkvision'` directly).
function senseTypeOf(effect) {
  const st = String(effect?.senseType || '').trim();
  if (st) return st;
  return String(effect?.type || '').trim();
}

// Notes are often verbose ("Devil's Sight (normal vision in dim light ...)");
// keep only the feature name (text before the first parenthesis) for the tag.
function cleanSource(value) {
  return String(value || '').split('(')[0].trim();
}

// --- Normalize each domain into uniform vision entries -------------------

function speciesVisionEntries(C) {
  const dv = Number(C?.speciesSnapshot?.darkvision || 0);
  if (!dv) return [];
  return [{ type: 'darkvision', range: dv, source: 'Species', additive: false, note: null }];
}

function itemVisionEntries(C) {
  return Object.entries(getItemSenses(C) || {})
    .map(([type, dist]) => ({ type, range: Number(dist || 0), source: 'Magic Item', additive: false, note: null }))
    .filter((e) => e.range > 0);
}

// Sheet effects split into numeric vision entries and non-ranged senses
// (telepathy without ft, underwater breathing, ...) kept as passthrough rows.
function sheetSenseEntries(C) {
  const vision = [];
  const other = [];
  collectSenseEffects(C).forEach((effect) => {
    const type = senseTypeOf(effect);
    const range = Number(effect.value || 0);
    const source = cleanSource(effect.note) || effect.ownerName || 'Feature';
    if (type && range > 0) {
      vision.push({ type, range, source, additive: !!effect.additive, note: effect.note || null });
    } else {
      other.push({ effect, source });
    }
  });
  return { vision, other };
}

function collectVisionEntries(C) {
  const { vision, other } = sheetSenseEntries(C);
  return {
    vision: [...speciesVisionEntries(C), ...itemVisionEntries(C), ...vision],
    other,
  };
}

// --- Resolve one sense type's entries to a single displayed value --------

function resolveGroup(entries) {
  const fixed = entries.filter((e) => !e.additive);
  const base = fixed.reduce((max, e) => Math.max(max, e.range), 0);
  let best = base;
  let winner = fixed.find((e) => e.range === base) || null;
  entries.forEach((e) => {
    const effective = e.additive ? base + e.range : e.range;
    if (effective > best) {
      best = effective;
      winner = e;
    }
  });
  return { range: best, source: winner?.source || null, note: winner?.note || null };
}

// Hide a source tag that just repeats the sense name (e.g. Devil's Sight).
function tagFor(source, label) {
  return source && source !== label ? source : null;
}

// --- Public API ----------------------------------------------------------

// All Senses-panel rows in a single pipeline pass. Each row carries the keys the
// UI needs to resolve live rules text: `type` (generic sense lookup),
// `featureName` (named-feature lookup, e.g. "Devil's Sight"), and a raw `note`
// fallback.
//   vision: [{ type, label, range, source, featureName, note }]  — grouped
//   other:  [{ key, type, label, value, source, featureName, note }]  — passthrough
export function collectSenses(C) {
  const { vision, other } = collectVisionEntries(C);

  const groups = new Map();
  vision.forEach((entry) => {
    if (!groups.has(entry.type)) groups.set(entry.type, []);
    groups.get(entry.type).push(entry);
  });
  const visionRows = [...groups.entries()].map(([type, entries]) => {
    const { range, source, note } = resolveGroup(entries);
    const label = senseLabel(type);
    return { type, label, range, source: tagFor(source, label), featureName: source, note };
  });

  const otherRows = other.map(({ effect, source }, index) => {
    const type = senseTypeOf(effect);
    const label = senseLabel(type);
    return {
      key: `${source}-${effect.type}-${index}`,
      type,
      label,
      value: effect.value != null && typeof effect.value !== 'number' ? String(effect.value) : 'Yes',
      source: tagFor(source, label),
      featureName: source,
      note: effect.note || null,
    };
  });

  return { vision: visionRows, other: otherRows };
}
