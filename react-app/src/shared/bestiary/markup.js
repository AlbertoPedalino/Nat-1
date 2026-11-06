import { spell5eUrl } from './monsterUtils.js';
import { signed } from '../ui/numberFormat.js';
import { isStatBlockLeadIn, statBlockTagText } from '../content/statBlockTags.js';

function text(value) {
  return { type: 'text', text: String(value || '') };
}

function styleToken(kind, value) {
  return { type: kind, children: parseCleanTokens(value) };
}

function rollToken(notation, rollType, display = notation) {
  return { type: 'roll', notation: String(notation || ''), rollType, text: String(display || notation || '') };
}

export function parseCleanTokens(value) {
  if (!value) return [];
  const source = String(value);
  const tokens = [];
  const tagRe = /\{@([^}]+)\}/g;
  let cursor = 0;
  let match;
  while ((match = tagRe.exec(source))) {
    if (match.index > cursor) tokens.push(text(source.slice(cursor, match.index)));
    tokens.push(...tagToTokens(match[1]));
    cursor = tagRe.lastIndex;
  }
  if (cursor < source.length) tokens.push(text(source.slice(cursor)));
  return tokens.filter((token) => token.type !== 'text' || token.text);
}

function tagToTokens(rawTag) {
  const firstSpace = rawTag.indexOf(' ');
  const tag = (firstSpace === -1 ? rawTag : rawTag.slice(0, firstSpace)).trim();
  const arg = firstSpace === -1 ? '' : rawTag.slice(firstSpace + 1);
  const lower = tag.toLowerCase();

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
    const href = spell5eUrl(arg);
    return href ? [{ type: 'link', text: display, href }] : [text(display)];
  }
  if (lower === 'i') return [styleToken('italic', arg)];
  if (lower === 'b') return [styleToken('bold', arg)];
  if (lower === 'filter') return [text(arg.split('|')[0] || '')];
  if (/^[a-z]+$/i.test(lower) && arg) return [text(arg.split('|')[0] || '')];
  return [];
}

export function cleanToText(value) {
  return parseCleanTokens(value).map((token) => tokenText(token)).join('');
}

function tokenText(token) {
  if (token.type === 'text' || token.type === 'roll' || token.type === 'link') return token.text || '';
  if (Array.isArray(token.children)) return token.children.map(tokenText).join('');
  return '';
}
