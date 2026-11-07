import { signed } from '../ui/numberFormat.js';
import { statBlockTagText } from './statBlockTags.js';

// The one reader of 5etools inline markup ({@tag arg|more}). Every renderer —
// entry text, monster stat blocks, beast stat blocks — scans with it and
// turns the tags it cares about (rolls, links, styles) into its own tokens;
// the rest show `tagDisplayText`.

// Tags that point at a record: "name|source|display", shown by their display
// text when one is given.
export const REF_TAGS = new Set([
  'spell', 'item', 'creature', 'condition', 'skill', 'sense',
  'feat', 'class', 'subclass', 'race', 'background', 'action',
  'object', 'optfeature', 'reward', 'deity', 'language', 'variantrule',
]);

export function tagParts(arg) {
  return String(arg || '').split('|').map((part) => part.trim());
}

// What a tag shows as plain text: a stat-block label ({@atkr m} → "Melee
// Attack Roll:"), a number ({@hit 5} → "+5"), a record's display name, else
// its first part.
export function tagDisplayText(tag, arg) {
  const parts = tagParts(arg).filter(Boolean);
  const label = statBlockTagText(tag, parts[0]);
  if (label != null) return label;
  if (!parts.length) return '';
  if (tag === 'hit') return `+${parts[0].replace(/^\+/, '')}`;
  if (tag === 'd20') return signed(parts[0]);
  if (tag === 'chance') return `${parts[0]}%`;
  // {@scaledamage base|levels|step}: cantrip scaling, the base and its step.
  if (tag === 'scaledamage') return parts[2] ? `${parts[0]} (+${parts[2]}/level)` : parts[0];
  // {@scaledice base|levels|step}: the sentence already says "for each slot
  // level above N", so only the step die.
  if (tag === 'scaledice') return parts[2] || parts[0];
  if (REF_TAGS.has(tag) && parts.length >= 3) return parts[parts.length - 1];
  return parts[0];
}

// A tag inside another tag ({@tip {@link DnD Beyond|https://…}|…}) becomes its
// shown text first, so the outer one reads like any other.
function flattenNestedTags(text) {
  const nested = /(\{@\w+\s+[^{}]*)\{@(\w+)(?:\s+([^{}]*))?\}/g;
  let current = text;
  let previous;
  do {
    previous = current;
    current = current.replace(nested, (_match, head, tag, content) => `${head}${tagDisplayText(tag.toLowerCase(), content || '')}`);
  } while (current !== previous);
  return current;
}

// The text split into plain runs and tags: { text, segments }, where `text`
// is the source with nested tags flattened and each segment is
// { type: 'text', text } or { type: 'tag', tag (lowercase), arg, start, end }
// (offsets into `text`).
export function scanMarkup(raw) {
  const text = flattenNestedTags(String(raw ?? ''));
  const segments = [];
  const re = /\{@(\w+)(?:\s+([^{}]*))?\}/g;
  let cursor = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) segments.push({ type: 'text', text: text.slice(cursor, match.index) });
    segments.push({ type: 'tag', tag: match[1].toLowerCase(), arg: match[2] || '', start: match.index, end: re.lastIndex });
    cursor = re.lastIndex;
  }
  if (cursor < text.length) segments.push({ type: 'text', text: text.slice(cursor) });
  return { text, segments };
}
