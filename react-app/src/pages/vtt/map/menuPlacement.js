import { useCallback, useRef } from 'react';
import { useEventListener } from '../../../shared/ui/useEventListener.js';
import { clamp } from '../../../shared/numbers.js';

// Where a piece's or a mark's menu opens, and what it does when a field in it
// is typed into.
//
// With a mouse, at the pointer, positioned by the menu itself. On a touch
// screen that went wrong as soon as a field was tapped: the keyboard shortened
// the window and the menu was clamped back inside it, so a menu opened low
// jumped up under the thumb that was writing. Pinning it to the top of the map
// instead stopped the jump but took it away from where it was pressed.
//
// So on a touch screen it opens at the press, placed once, and is then left
// alone — the menu's own repositioning is switched off. When the keyboard
// would cover the field being typed into, it is lifted just enough to keep
// that field in view, and set back where it was when the keyboard goes.

const EDGE = 8;

export function coarsePointer() {
  return Boolean(globalThis.matchMedia?.('(pointer: coarse)').matches);
}

// Returns props for the MUI Menu, and transition handlers to merge into its
// `slotProps.transition`.
export function useMenuPlacement(anchor) {
  const touch = coarsePointer();
  const paperRef = useRef(null);
  // Where the menu was placed when it opened, and how far it is lifted now.
  const baseTopRef = useRef(0);
  const liftRef = useRef(0);

  const place = useCallback((paper) => {
    paperRef.current = paper;
    liftRef.current = 0;
    if (!paper || !anchor) return;
    const root = paper.parentElement;
    const width = root?.clientWidth || globalThis.innerWidth || 0;
    const height = root?.clientHeight || globalThis.innerHeight || 0;
    const left = clamp(anchor.x, EDGE, width - paper.offsetWidth - EDGE);
    const top = clamp(anchor.y, EDGE, height - paper.offsetHeight - EDGE);
    baseTopRef.current = top;
    paper.style.left = `${Math.round(left)}px`;
    paper.style.top = `${Math.round(top)}px`;
  }, [anchor]);

  const viewport = globalThis.visualViewport;
  const keepFieldInView = () => {
    const paper = paperRef.current;
    if (!paper) return;
    const field = document.activeElement;
    const typing = paper.contains(field) && /^(INPUT|TEXTAREA)$/.test(field?.tagName || '');
    let lift = 0;
    if (typing) {
      const visibleBottom = (viewport ? viewport.offsetTop + viewport.height : globalThis.innerHeight) - EDGE;
      // Where the field's bottom would be with the menu back in its place.
      const bottom = field.getBoundingClientRect().bottom + liftRef.current;
      lift = clamp(bottom - visibleBottom, 0, baseTopRef.current - EDGE);
    }
    if (lift === liftRef.current) return;
    liftRef.current = lift;
    paper.style.top = `${Math.round(baseTopRef.current - lift)}px`;
  };
  const followsKeyboard = touch && Boolean(anchor);
  useEventListener(viewport, 'resize', keepFieldInView, { enabled: followsKeyboard });
  useEventListener(viewport, 'scroll', keepFieldInView, { enabled: followsKeyboard });
  useEventListener(globalThis, 'resize', keepFieldInView, { enabled: followsKeyboard });
  useEventListener(document, 'focusin', keepFieldInView, { enabled: followsKeyboard });
  useEventListener(document, 'focusout', keepFieldInView, { enabled: followsKeyboard });

  if (!touch) {
    return {
      menuProps: {
        anchorReference: 'anchorPosition',
        anchorPosition: anchor ? { top: anchor.y, left: anchor.x } : undefined,
      },
      transitionProps: {},
    };
  }
  // 'none': the menu never moves the paper itself, on open or on resize.
  return { menuProps: { anchorReference: 'none' }, transitionProps: { onEntering: place } };
}
