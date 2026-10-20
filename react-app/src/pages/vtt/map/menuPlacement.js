// Where a piece's or a mark's menu opens.
//
// With a mouse, at the pointer. On a touch screen that went wrong as soon as
// a field was tapped: the keyboard shortened the window, the menu was moved to
// still fit inside it — and moved again on every letter typed, because each
// one re-rendered it — so it jumped up under the thumb that was writing. There
// it opens pinned to the top of the map, centred, where the keyboard never
// reaches, and stays put.

const EDGE = 8;

export function coarsePointer() {
  return Boolean(globalThis.matchMedia?.('(pointer: coarse)').matches);
}

// Props for the MUI Menu, and the paper's position to merge into its sx.
// `width` is the paper's width, to centre it without a transform (the menu's
// own grow animation owns the transform).
export function menuPlacement(anchor, width) {
  if (!coarsePointer()) {
    return {
      menuProps: {
        anchorReference: 'anchorPosition',
        anchorPosition: anchor ? { top: anchor.y, left: anchor.x } : undefined,
      },
      paperSx: {},
    };
  }
  return {
    menuProps: { anchorReference: 'none' },
    paperSx: {
      top: EDGE,
      left: `max(${EDGE}px, calc(50% - ${width / 2}px))`,
      maxHeight: `calc(100% - ${EDGE * 2}px)`,
    },
  };
}
