import { useEffect } from 'react';
import { useDiceSet } from '../../ui/DiceSetScope.jsx';
import { stickerSx } from '../../ui/pressable.js';
import { VTT_COLORS } from '../../vtt/colors.js';
import { warmDieFaces } from './Die3D.jsx';
import { dieColor } from './dieColors.js';
import { ROLL_LOG_COLORS } from './rollLogPresentation.js';
import { ROLL_MODE_CHIP } from './rollToastLayout.js';

// Everything a roll draws that is a theme value (themedValues.js), worked out
// ahead: each one first drawn rewrites every variable on :root and restyles
// the whole page, which landed in the middle of the first throw after a page
// load (nineteen of them for a first roll with advantage). Each item is taken
// from where it is decided, so a new colour or chip is warmed with it. A
// natural 20's and 1's shadow and burst are worked out by rollMoment.js
// itself, as a bubble's shadows are by bubble.js.

// What every roll may draw, whoever's dice: the colours a result is written
// in on a die (the roll log's, and the map's thrown dice) and the mode chips.
// Worked out as the module loads, before any roll can be shown.
[VTT_COLORS.thrownDie, ...Object.values(ROLL_LOG_COLORS)].forEach((color) => dieColor(color));
Object.values(ROLL_MODE_CHIP).forEach(({ tone }) => stickerSx(tone));

// The faces of every die in a set (`dice`: resolved, useDiceSet), kept and
// dropped. The viewer's set only: every set there is would be hundreds of
// pictures on :root. Another player's dice, seen for the first time, still
// register theirs. Once a set: every toast and tray on a page asks.
const warmedSets = new Set();
const setKey = (dice) => `${dice.id}|${dice.style?.id}`;

export function warmRolls(dice) {
  const key = setKey(dice);
  if (warmedSets.has(key)) return;
  warmedSets.add(key);
  warmDieFaces(dice);
}

// Warms the viewer's dice once the page is idle, again when they change them:
// wherever rolls are shown (DiceToast) or thrown (DiceTray). Keyed by the
// set (useDiceSet hands a new object each render).
export function useWarmRolls() {
  const dice = useDiceSet();
  const key = setKey(dice);
  useEffect(() => {
    const idle = globalThis.requestIdleCallback;
    if (idle) {
      const handle = idle(() => warmRolls(dice), { timeout: 2000 });
      return () => globalThis.cancelIdleCallback?.(handle);
    }
    const timer = setTimeout(() => warmRolls(dice), 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
