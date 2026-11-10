import { SWATCH_COLORS } from '../ui/swatches.js';
import { normalizeHexColor } from '../ui/colors.js';

// How combatants are told apart: label shapes and colours for monsters,
// colours for players, both from the shared swatches.
export const PLAYER_COLORS = Object.freeze(SWATCH_COLORS.slice(0, 10));

// A party member's colour: the one picked, else their class icon's, else the
// palette's for their slot.
export function playerColor(player, index = 0) {
  return normalizeHexColor(player?.color, '')
    || normalizeHexColor(player?.iconColor, '')
    || PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export const COMBAT_LABEL_SHAPES = Object.freeze(['■', '●', '⬟', '⬢', '▲', '◆', '★', '◉', '▼', '◈']);

// The letter of the `index`-th creature of a name: Goblin A, Goblin B…, a lone
// one included (user decision 2026-11-10: the same name on every surface).
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function combatLetter(index) {
  return LETTERS[Math.max(0, Math.trunc(Number(index) || 0)) % LETTERS.length];
}

// Offset from the player colours, so the first monster label is not the
// first player's colour.
export const COMBAT_LABEL_COLORS = Object.freeze([...SWATCH_COLORS.slice(1), SWATCH_COLORS[0]].slice(0, 10));
