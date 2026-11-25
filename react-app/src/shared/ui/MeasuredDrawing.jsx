import { useRef } from 'react';
import { parentOf, useElementSize } from './useElementSize.js';
import HandDrawnSvg from './HandDrawnSvg.jsx';

// A drawing made to the size of the box it is in (its parent, measured as it
// is laid out and again whenever it is resized): `draw(width, height, box)`
// (`box` the element itself, for a drawing laid by what it holds) answers its
// pieces and the box they are seen through (a drawing module's
// own function: abilityTile, toastFrame, noticeFrame…), or null for none. Laid
// behind what the box holds (the box a layer of its own, `isolation:
// isolate`), or over it when `front`. What an ability score, a roll's toast
// and an app notice are drawn with, where the style draws them.
const BEHIND = Object.freeze({ zIndex: -1 });
export default function MeasuredDrawing({ draw, front = false }) {
  const ref = useRef(null);
  const box = useElementSize(ref, parentOf);
  const drawing = box?.width > 0 ? draw(box.width, box.height, ref.current && parentOf(ref.current)) : null;
  return <HandDrawnSvg ref={ref} pieces={drawing?.pieces} box={drawing?.box} style={front ? undefined : BEHIND} />;
}
