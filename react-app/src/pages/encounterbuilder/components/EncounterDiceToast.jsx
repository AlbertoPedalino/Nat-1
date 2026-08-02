import DiceToast from '../../../shared/character/DiceToast.jsx';

export default function EncounterDiceToast({ toast, onClose }) {
  return <DiceToast toast={toast} onClose={onClose} />;
}

export function buildEncounterDiceToast(result) {
  if (!result) return null;
  const detail = result.mathStr || '';
  const meta = parseD20Meta(detail);
  return {
    label: result.actor ? `${result.actor} - ${result.type || 'Roll'}` : result.type || 'Roll',
    detail,
    total: result.result,
    rolls: parseRolls(detail, result),
    meta,
    timestamp: Date.now(),
  };
}

function parseRolls(detail, result) {
  const rolls = [];
  const dicePattern = /(\d+)d(\d+)\s*\[([^\]]*)\]/gi;
  let match;
  while ((match = dicePattern.exec(detail))) {
    const faces = Number(match[2]);
    String(match[3])
      .split(',')
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite)
      .forEach((value) => rolls.push({ v: value, faces }));
  }
  if (!rolls.length && result?.naturalD20 != null) {
    rolls.push({ v: result.naturalD20, faces: 20 });
  }
  return rolls;
}

function parseD20Meta(detail) {
  const match = String(detail || '').match(/1d20\s*\(\s*\d+\s*\)\s*([+-]\d+)/i);
  if (!match) return undefined;
  return { bonus: Number(match[1]) };
}
