import { useEffect } from 'react';
import { LAYERS } from '../../ui/layers.js';
import { Box } from '@mui/material';
import { resolveToastLayout } from './rollToastLayout.js';
import { SHOUT_TILT, bubbleSx, bubbleTailSx } from '../../ui/bubble.js';
import { useRollMoment } from '../../ui/rollMoment.js';
import RollMomentEffect from '../../ui/RollMomentEffect.jsx';
import { useWarmRolls } from './warmRolls.js';
import DrawnToast, { useDrawnToast } from '../../ui/DrawnToast.jsx';
import RollSaid from './RollSaid.jsx';

// Shared, not the character sheet's own: the sheet, the encounter builder and
// the battle map all show a roll the same way, and the layout behind it is
// shared too so they cannot drift apart.

const toastRootSx = {
  position: 'fixed', bottom: '1.2rem', right: '1.2rem', zIndex: LAYERS.diceToast,
  // A speech bubble, its tail pointing down at the dice dock the roll came from.
  ...bubbleSx(), ...bubbleTailSx({ side: 'bottom', at: '82%' }),
  p: '1rem 1.2rem', minWidth: 260, maxWidth: 360,
  // No backdrop blur: behind a 95%-opaque surface it could not be seen, and
  // over the battle map, where something always moves underneath, it was
  // recomputed every frame — the roller's map fell to about ten frames a
  // second for as long as the toast was up.
};


// A toast the style draws in place of its bubble (DrawnToast.jsx): where it
// stands.
const drawnRootSx = { position: 'fixed', bottom: '1.6rem', right: '1.6rem', zIndex: LAYERS.diceToast, minWidth: 250, maxWidth: 330 };

export default function DiceToast({ toast, onClose, hidden = false }) {
  // What a roll draws worked out ahead, so the first one after a page load
  // does not restyle the page as it shows (warmRolls.js).
  useWarmRolls();
  const { kind: drawing, drawn: drawnToast } = useDrawnToast();
  const layout = toast ? resolveToastLayout(toast) : null;
  // Its colour, and a natural 20's or 1's moment (rollMoment.js).
  const drawn = useRollMoment(layout, SHOUT_TILT);
  const { moment } = drawn;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  // Keep the expiry running while hidden so returning to the map cannot revive
  // an old result that arrived during the background view.
  if (!toast || hidden) return null;

  // The moment of the throw: two rolls a second apart are two throws, and the
  // same throw re-rendered is still one.
  const seed = `${toast.timestamp || 0}:${layout.label}`;

  const said = <RollSaid layout={layout} moment={drawn} seed={seed} rolledWith={toast.dice} onClose={onClose} />;

  if (drawnToast) {
    return <DrawnToast kind={drawing} moment={moment} seed={seed} sx={drawnRootSx}>{said}</DrawnToast>;
  }

  return (
    <Box sx={{
      ...toastRootSx,
      // The roll's colour throws the bubble's shadow; a 20 or a 1 its own.
      ...drawn.bubbleSx,
    }}>
      <RollMomentEffect key={`moment:${seed}`} moment={moment} seed={seed} />
      {said}
    </Box>
  );
}
