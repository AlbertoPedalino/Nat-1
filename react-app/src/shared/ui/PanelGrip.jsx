import { useRef } from 'react';
import { panelGrip } from './panelGrip.js';
import { parentOf, useElementSize } from './useElementSize.js';
import HandDrawnSvg from './HandDrawnSvg.jsx';

// What grips a panel (shapes.js panel.grip, panelGrip.js), drawn over its bar:
// cut to the panel's size, measured as it is laid out and again whenever it is
// resized. The bar is the drawing's parent, its box's top left corner; the
// panel the bar's. It never takes a pointer: what is under it stays pressable.

const panelOf = (drawing) => parentOf(parentOf(drawing)) || parentOf(drawing);

export default function PanelGrip({ kind }) {
  const ref = useRef(null);
  const bar = useElementSize(ref, parentOf);
  const panel = useElementSize(ref, panelOf);
  const grip = bar?.width > 0 && panel ? panelGrip(kind, bar.width, panel.height) : null;
  return <HandDrawnSvg ref={ref} pieces={grip?.pieces} box={grip?.box} style={{ zIndex: 1 }} />;
}
