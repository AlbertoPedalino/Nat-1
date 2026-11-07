import { signed } from '../ui/numberFormat.js';
import { isStatBlockLeadIn, statBlockTagText } from '../content/statBlockTags.js';
import { scanMarkup, tagDisplayText } from '../content/inlineMarkup.js';
import { get5eToolsSpellUrl } from '../content/fiveEToolsLinks.js';

function text(value) {
  return { type: 'text', text: String(value || '') };
}

function styleToken(kind, value) {
  return { type: kind, children: parseCleanTokens(value) };
}

function rollToken(notation, rollType, display = notation) {
  return { type: 'roll', notation: String(notation || ''), rollType, text: String(display || notation || '') };
}

// A monster's stat-block prose as tokens: text, rolls ({@hit}, {@damage},
// {@d20}), spell links and styled runs; every other tag shows its display
// text (inlineMarkup.js).
export function parseCleanTokens(value) {
  if (!value) return [];
  const tokens = [];
  scanMarkup(value).segments.forEach((segment) => {
    if (segment.type === 'text') tokens.push(text(segment.text));
    else tokens.push(...tagToTokens(segment.tag, segment.arg));
  });
  return tokens.filter((token) => token.type !== 'text' || token.text);
}

function tagToTokens(lower, arg) {

  const label = statBlockTagText(lower, arg);
  if (label != null) return [isStatBlockLeadIn(lower) ? styleToken('italic', label) : text(label)];
  if (lower === 'hit') {
    const notation = signed(arg);
    return [rollToken(notation, 'Attack Roll', notation)];
  }
  if (lower === 'damage') return [rollToken(arg, 'Damage', arg)];
  if (lower === 'd20') {
    const notation = signed(arg);
    return [rollToken(notation, 'D20 Roll', notation)];
  }
  if (lower === 'spell') {
    const parts = arg.split('|');
    const display = parts[2] || parts[0] || '';
    const href = get5eToolsSpellUrl({ name: parts[0], source: parts[1] || 'XPHB' });
    return href ? [{ type: 'link', text: display, href }] : [text(display)];
  }
  if (lower === 'i') return [styleToken('italic', arg)];
  if (lower === 'b') return [styleToken('bold', arg)];
  return [text(tagDisplayText(lower, arg))];
}

export function cleanToText(value) {
  return parseCleanTokens(value).map((token) => tokenText(token)).join('');
}

function tokenText(token) {
  if (token.type === 'text' || token.type === 'roll' || token.type === 'link') return token.text || '';
  if (Array.isArray(token.children)) return token.children.map(tokenText).join('');
  return '';
}
