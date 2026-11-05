import { LOG_MAX } from '../state/constants.js';
import { normalizeRollIdentity } from '../../../shared/character/dice/rollLogPresentation.js';

// The builder's roll log. Rolls themselves come from shared/character/dice
// (rollNotation.js on top of the one dice engine, dice.js).
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
      bonus: roll.bonus,
      mode: roll.mode,
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
