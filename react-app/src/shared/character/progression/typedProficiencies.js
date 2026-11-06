import { canonicalProficiencyLabel } from './proficiencyDisplay.js';
import { matchKey } from '../../content/nameKeys.js';

const TYPED_PROFICIENCY_RE = /^(skill|tool|language|weapon):(.+)$/i;
const CHOICE_PLACEHOLDER_RE = /\bchoose\b|\byour choice\b|\bof your choice\b|\bone type\b/i;

// The keys of a 5etools proficiency block that ask for a choice instead of
// naming a fixed proficiency ({ choose }, { anyTool: 1 }, …).
export const PROFICIENCY_CHOICE_KEYS = Object.freeze([
  'choose', 'any', 'anyTool', 'anyArtisansTool', 'anyMusicalInstrument', 'anyGamingSet', 'anyStandard', 'anyExotic',
]);

function stripTags(value) {
  return String(value ?? '')
    .replace(/\{@[a-z]+ ([^|}]+)(?:\|[^}]*)?\}/gi, '$1')
    .replace(/[{}]/g, '')
    .split('|')[0]
    .trim();
}

function untypedLabel(value) {
  return stripTags(value).replace(/_/g, ' ').trim();
}

export function isChoicePlaceholderValue(value) {
  return CHOICE_PLACEHOLDER_RE.test(stripTags(value));
}

export function parseTypedProficiencyValue(value) {
  const raw = String(value ?? '');
  const stripped = stripTags(raw);
  const match = stripped.match(TYPED_PROFICIENCY_RE);
  if (match) {
    return {
      kind: match[1].toLowerCase(),
      label: canonicalProficiencyLabel(match[2]),
      raw,
    };
  }
  return {
    kind: null,
    label: untypedLabel(raw),
    raw,
  };
}

export function splitTypedProficiencies(values) {
  const out = { skill: [], tool: [], language: [], weapon: [], untyped: [] };
  const list = Array.isArray(values) ? values : [values];
  list.flat().forEach((value) => {
    if (value == null || value === '') return;
    const parsed = parseTypedProficiencyValue(value);
    if (!parsed.label) return;
    if (parsed.kind && Array.isArray(out[parsed.kind])) {
      out[parsed.kind].push(parsed.label);
    } else {
      out.untyped.push(parsed.label);
    }
  });
  return out;
}

export function extractFixedProficiencyLabels(blocks) {
  const labels = [];
  const list = Array.isArray(blocks) ? blocks : [blocks];
  list.forEach((block) => {
    if (!block) return;
    if (typeof block === 'string') {
      block.split(/[;,]/).forEach((piece) => {
        const trimmed = piece.trim();
        if (!trimmed) return;
        if (isChoicePlaceholderValue(trimmed)) return;
        const parsed = parseTypedProficiencyValue(trimmed);
        const label = parsed.kind ? parsed.label : canonicalProficiencyLabel(parsed.label);
        if (label) labels.push(label);
      });
      return;
    }
    if (typeof block !== 'object') return;
    Object.entries(block).forEach(([key, value]) => {
      if (value === false) return;
      if (PROFICIENCY_CHOICE_KEYS.includes(key)) return;
      if (isChoicePlaceholderValue(key)) return;
      const parsed = parseTypedProficiencyValue(key);
      const label = parsed.kind ? parsed.label : canonicalProficiencyLabel(parsed.label);
      if (label) labels.push(label);
    });
  });
  return labels;
}

export function uniqueProficiencyLabels(values) {
  const seen = new Set();
  const out = [];
  (Array.isArray(values) ? values : [values]).flat().forEach((value) => {
    if (value == null || value === '') return;
    const label = canonicalProficiencyLabel(value);
    const key = matchKey(label);
    if (!label || !key || seen.has(key)) return;
    seen.add(key);
    out.push(label);
  });
  return out;
}

