import { useLayoutEffect, useRef } from 'react';
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
//
// Every name on the page is fitted together, in one pass: each name's size
// cleared, then every name measured, then every size written; so the page is
// laid out once for all of them, not once a name. A sheet holds some fifty,
// and a face loading (a toast's typewriter, its first time) refitted them one
// by one, a layout each: a click's toast came late.
const QUEUED = new Map();
let flushing = false;
function fitQueued() {
  flushing = false;
  const names = [...QUEUED].filter(([el]) => el.isConnected);
  QUEUED.clear();
  names.forEach(([el]) => writeLiveStyle(el, { fontSize: null }));
  const sizes = names.map(([el, min]) => {
    const room = el.clientWidth;
    const need = el.scrollWidth;
    // Both are whole pixels: a name a fraction of a pixel too wide still
    // measures as wide as its box, and is cut with an ellipsis. Only a name
    // measured narrower than its box surely fits.
    if (!room || need < room) return null;
    const base = parseFloat(getComputedStyle(el).fontSize);
    // A hair under the exact ratio: the ink's outline and a slanted face's
    // overhang reach past the measured advance.
    return Math.max(base * min, (base * room * 0.96) / need);
  });
  names.forEach(([el], i) => { if (sizes[i] !== null) writeLiveStyle(el, { fontSize: sizes[i] }); });
}
// Fits `el` with the names queued with it: before the page is painted (the
// end of the render that asked), or on the next frame.
function queueFit(el, min, { frame = false } = {}) {
  QUEUED.set(el, min);
  if (flushing) return;
  flushing = true;
  if (frame && typeof requestAnimationFrame === 'function') requestAnimationFrame(fitQueued);
  else queueMicrotask(fitQueued);
}

export function useFitText(text, { min = 0.5, enabled = true } = {}) {
  const ref = useRef(null);
  const styleId = useStyleId();
  const box = useElementSize(enabled ? ref : NO_ELEMENT, parentOf);
  // A face finishing loading: the name joins the next frame's one pass, with
  // no render of its own.
  useEventListener(globalThis.document?.fonts, 'loadingdone', () => ref.current && queueFit(ref.current, min, { frame: true }), { enabled });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!enabled) {
      writeLiveStyle(el, { fontSize: null });
      return undefined;
    }
    queueFit(el, min);
    // Once more after the frame: a new style's faces and fits are written on
    // the page's root by an effect that runs after this one.
    if (typeof requestAnimationFrame !== 'function') return undefined;
    const frame = requestAnimationFrame(() => queueFit(el, min));
    return () => cancelAnimationFrame(frame);
  }, [text, styleId, min, enabled, box?.width]);

  return ref;
}
