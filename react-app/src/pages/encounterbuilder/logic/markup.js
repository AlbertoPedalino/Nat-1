import { spell5eUrl } from './monsterUtils.js';

const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

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

  if (lower === 'actsave') {
    const ability = arg.trim().toLowerCase();
    return [styleToken('italic', `${ABILITY_NAMES[ability] || ability} Saving Throw:`)];
  }
  if (lower === 'actsavefail') return [styleToken('italic', `Failure${arg ? ` ${arg}` : ''}:`)];
  if (lower === 'actsavesuccess') return [styleToken('italic', 'Success:')];
  if (lower === 'actsavesuccessorfail') return [styleToken('italic', 'Failure or Success:')];
  if (lower === 'acttrigger') return [styleToken('italic', 'Trigger:')];
  if (lower === 'actresponse') return [styleToken('italic', 'Response:')];
  if (lower === 'hit') {
    const notation = Number(arg) >= 0 ? `+${arg}` : arg;
    return [rollToken(notation, 'Attack Roll', notation)];
  }
  if (lower === 'damage') return [rollToken(arg, 'Damage', arg)];
  if (lower === 'd20') {
    const notation = Number(arg) >= 0 ? `+${arg}` : arg;
    return [rollToken(notation, 'D20 Roll', notation)];
  }
  if (lower === 'spell') {
    const parts = arg.split('|');
    const display = parts[2] || parts[0] || '';
    const href = spell5eUrl(arg);
    return href ? [{ type: 'link', text: display, href }] : [text(display)];
  }
  if (lower === 'dc') return [text(`DC ${arg}`)];
  if (lower === 'h') return [styleToken('italic', 'Hit:'), text(' ')];
  if (lower === 'atk') return [styleToken('italic', `Attack ${arg}:`)];
  if (lower === 'recharge') return [text(`(Recharge ${arg}-6)`)];
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
