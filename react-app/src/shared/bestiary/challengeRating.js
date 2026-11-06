import { CR_XP } from './bestiaryConstants.js';

// A Challenge Rating as 5etools stores it: '1/4', 4, or { cr: '1/4', ... }.

// The CR as its printed text ('1/4', '5'), the key of CR tables. '0' when missing.
export function crKey(cr) {
  if (!cr) return '0';
  if (typeof cr === 'string') return cr;
  if (typeof cr === 'object') return String(cr.cr || '0');
  return String(cr);
}

// The CR as a number (0.25 for '1/4'), or null when it cannot be read.
export function crNumber(cr) {
  const raw = cr && typeof cr === 'object' ? cr.cr : cr;
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (text.includes('/')) {
    const [num, den] = text.split('/').map(Number);
    return den ? num / den : null;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

// A numeric CR as printed: 0.125 -> '1/8'; '—' when there is none.
export function formatCr(crNum) {
  if (crNum == null) return '—';
  if (crNum === 0.125) return '1/8';
  if (crNum === 0.25) return '1/4';
  if (crNum === 0.5) return '1/2';
  return String(crNum);
}

export function crXP(cr) {
  return CR_XP[crKey(cr)] || 0;
}

// Proficiency Bonus by Challenge Rating: +2 up to CR 4, then +1 every four CR.
export function crPB(cr) {
  return Math.max(2, Math.ceil((crNumber(cr) || 0) / 4) + 1);
}
