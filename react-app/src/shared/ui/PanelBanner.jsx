import { useRef } from 'react';
import { BANNER_HEIGHT, panelBanner } from './panelBanner.js';
import { parentOf, useElementSize } from './useElementSize.js';
import { useStyleId } from './themeIds.js';
import HandDrawnSvg from './HandDrawnSvg.jsx';

// A panel's title bar drawn as the style draws it (shapes.js panel.banner,
// panelBanner.js), behind what the bar holds: across the bar (the drawing's
// parent), measured as it is laid out and again whenever it is resized,
// centred in its height below the `room` kept over it (a grip's, GRIP_ROOM).

export default function PanelBanner({ kind, room = 0 }) {
  const ref = useRef(null);
  const styleId = useStyleId();
  const bar = useElementSize(ref, parentOf);
  const banner = bar?.width > 0 ? panelBanner(kind, bar.width, styleId) : null;
  const top = bar ? room + Math.max(0, bar.height - room - BANNER_HEIGHT) / 2 : 0;
  return <HandDrawnSvg ref={ref} pieces={banner?.pieces} box={banner?.box} style={{ left: 0, top, zIndex: -1 }} />;
}
