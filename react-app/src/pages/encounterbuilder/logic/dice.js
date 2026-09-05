import { LOG_MAX } from './constants.js';
import { normalizeRollIdentity } from '../../../shared/character/rollLogPresentation.js';

export function rollDie(faces, rng = Math.random) {
  return Math.floor(rng() * faces) + 1;
}

export function rollDiceFormula(formula, rng = Math.random) {
  const normalized = String(formula || '').replace(/\s+/g, '').toLowerCase();
  const tokenRe = /([+-]?)(\d*)d(\d+)|([+-]?\d+)/gi;
  const parts = [];
  let result = 0;
  let maxResult = 0;
  let cursor = 0;
  let dieCount = 0;
  let naturalD20 = null;
  let match;

  while ((match = tokenRe.exec(normalized))) {
    if (match.index !== cursor) return null;
    cursor = tokenRe.lastIndex;

    if (match[3]) {
      const sign = match[1] === '-' ? -1 : 1;
      const count = Number(match[2] || 1);
      const faces = Number(match[3]);
      if (!Number.isInteger(count) || count < 1 || !Number.isInteger(faces) || faces < 1) return null;

      const values = Array.from({ length: count }, () => rollDie(faces, rng));
      const subtotal = values.reduce((sum, value) => sum + value, 0);
      result += sign * subtotal;
      maxResult += sign > 0 ? count * faces : -count;
      dieCount += count;
      if (count === 1 && faces === 20 && sign > 0) naturalD20 = values[0];
      const prefix = parts.length === 0 ? (sign < 0 ? '-' : '') : (sign < 0 ? ' - ' : ' + ');
      parts.push(`${prefix}${count}d${faces} [${values.join(', ')}]`);
    } else {
      const value = Number(match[4]);
      result += value;
      maxResult += value;
      const prefix = parts.length === 0 ? '' : (value < 0 ? ' - ' : ' + ');
      parts.push(`${prefix}${parts.length === 0 ? value : Math.abs(value)}`);
    }
  }

  if (cursor !== normalized.length || parts.length === 0) return null;
  return {
    result,
    maxResult,
    naturalD20: dieCount === 1 ? naturalD20 : null,
    mathStr: parts.join(''),
  };
}

export function resultClass(result, maxResult, naturalD20 = null) {
  if (naturalD20 != null) {
    if (naturalD20 === 20) return 'nat20';
    if (naturalD20 === 1) return 'nat1';
  }
  return result >= maxResult * 0.75 ? 'high' : result >= maxResult * 0.4 ? 'mid' : 'low';
}

export function rollDice(notation, type = 'Roll', rng = Math.random) {
  const formula = String(notation || '').replace(/\s+/g, '').toLowerCase();
  if (!formula) return null;
  const rollResult = formula.startsWith('+') || formula.startsWith('-') || !formula.includes('d')
    ? rollModifier(formula, rng)
    : rollDiceFormula(formula, rng);
  if (!rollResult) return null;
  return {
    type,
    notation,
    ...rollResult,
    cls: resultClass(rollResult.result, rollResult.maxResult, rollResult.naturalD20),
  };
}

function rollModifier(formula, rng) {
  const mod = parseInt(formula, 10) || 0;
  const naturalD20 = rollDie(20, rng);
  return {
    result: naturalD20 + mod,
    maxResult: 20 + mod,
    naturalD20,
    mathStr: `1d20 (${naturalD20}) ${mod >= 0 ? `+${mod}` : mod}`,
  };
}

export function addRollLogEntry(log, roll, actor, now = new Date()) {
  if (!roll) return Array.isArray(log) ? log : [];
  if (roll.id && (log || []).some((entry) => entry.id === roll.id)) return log;
  if (roll.timestamp) now = new Date(roll.timestamp);
  const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return [
    {
      id: roll.id,
      visibility: roll.visibility,
      actor: actor || null,
      ...normalizeRollIdentity(roll),
      rolls: roll.rolls,
      naturalD20: roll.naturalD20,
      type: roll.type,
      result: roll.result,
      mathStr: roll.mathStr,
      note: String(roll.note || ''),
      timeStr,
      cls: roll.cls,
    },
    ...(Array.isArray(log) ? log : []),
  ].slice(0, LOG_MAX);
}
