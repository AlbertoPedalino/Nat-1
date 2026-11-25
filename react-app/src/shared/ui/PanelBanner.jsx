import { useMemo, useRef } from 'react';
import { BANNER_HEIGHT, panelBanner } from './panelBanner.js';
import { parentOf, useElementSize } from './useElementSize.js';
import { useStyleId } from './themeIds.js';
import HandDrawnSvg from './HandDrawnSvg.jsx';

// A panel's title bar drawn as the style draws it (shapes.js panel.banner,
// panelBanner.js), behind what the bar holds: across the part of the bar it
// is drawn in (the drawing's parent: the badge, the title and the count),
// measured as it is laid out and again whenever it is resized, centred in
// its height; `seed` names the panel, for a banner drawn its own way on each.

export default function PanelBanner({ kind, seed = '' }) {
  const ref = useRef(null);
  const styleId = useStyleId();
  const bar = useElementSize(ref, parentOf);
  const banner = bar?.width > 0 ? panelBanner(kind, bar.width, styleId, seed) : null;
  const top = bar ? Math.max(0, bar.height - BANNER_HEIGHT) / 2 : 0;
  // The same place for the same height, so the drawing is not drawn again.
  const place = useMemo(() => ({ left: 0, top, zIndex: -1 }), [top]);
  return <HandDrawnSvg ref={ref} pieces={banner?.pieces} box={banner?.box} style={place} />;
}
