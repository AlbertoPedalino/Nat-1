import { SWATCH_COLORS } from '../ui/swatches.js';

// How combatants are told apart: label shapes and colours for monsters,
// colours for players, both from the shared swatches.
export const PLAYER_COLORS = Object.freeze(SWATCH_COLORS.slice(0, 10));

export const COMBAT_LABEL_SHAPES = Object.freeze(['■', '●', '⬟', '⬢', '▲', '◆', '★', '◉', '▼', '◈']);

// Offset from the player colours, so the first monster label is not the
// first player's colour.
export const COMBAT_LABEL_COLORS = Object.freeze([...SWATCH_COLORS.slice(1), SWATCH_COLORS[0]].slice(0, 10));
