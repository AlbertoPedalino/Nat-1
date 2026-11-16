import { useLayoutEffect, useRef, useState } from 'react';
import { useStyleId } from './themeIds.js';
import { parentOf, useElementSize } from './useElementSize.js';
import { useEventListener } from './useEventListener.js';
import { writeLiveStyle } from './liveStyle.js';

// No element to measure: a fit turned off keeps no observer.
const NO_ELEMENT = Object.freeze({ current: null });

// Shrinks a one-line name until it fits its box, from the size its sx gives
// it down to `min` of it. Measured, not guessed: each style letters its
// headings in a face of its own, drawn larger or smaller by its fit
// (fonts.js FONT_FITS, a font-size-adjust), so no size worked out from the
// box's width alone keeps every face inside it (a wide face, raised, ran past
// a stat tile's narrow bar and a banner's title and was cut). Measured again
// when the box changes width (useElementSize), when a face finishes loading
// and when the style changes (its face and fit change with no change of
// width). The element must hold its text on one line with its overflow hidden
// (Typography noWrap, ONE_LINE_SX), so it is as wide as its box and
// scrollWidth is the text's own width. `enabled` false leaves the name at its
// size (a title that wraps instead). Returns the ref to put on the element.
export function useFitText(text, { min = 0.5, enabled = true } = {}) {
  const ref = useRef(null);
  const styleId = useStyleId();
  const box = useElementSize(enabled ? ref : NO_ELEMENT, parentOf);
  const [facesLoaded, setFacesLoaded] = useState(0);
  useEventListener(globalThis.document?.fonts, 'loadingdone', () => setFacesLoaded((n) => n + 1), { enabled });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      writeLiveStyle(el, { fontSize: null });
      if (!enabled) return;
      const room = el.clientWidth;
      const need = el.scrollWidth;
      if (!room || need <= room) return;
      const base = parseFloat(getComputedStyle(el).fontSize);
      // A hair under the exact ratio: the ink's outline and a slanted face's
      // overhang reach past the measured advance.
      writeLiveStyle(el, { fontSize: Math.max(base * min, (base * room * 0.96) / need) });
    };
    fit();
    if (!enabled || typeof requestAnimationFrame !== 'function') return undefined;
    // Once more after the frame: a new style's faces and fits are written on
    // the page's root by an effect that runs after this one.
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
  }, [text, styleId, min, enabled, box?.width, facesLoaded]);

  return ref;
}
