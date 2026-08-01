// Pure motion math and style contract for the drag reorder. The hook that uses
// it only reads rectangles and writes custom properties, so all the arithmetic
// stays testable outside a DOM.

export const FLIP_DURATION_MS = 180;

// The dragged card is moved by custom properties instead of by overwriting
// `transform` directly: the card keeps declaring its own transform in `sx`, so
// nothing can silently fight the drag over who owns that property.
export const OFFSET_X_VAR = '--note-drag-x';
export const OFFSET_Y_VAR = '--note-drag-y';
export const SLIDE_VAR = '--note-drag-slide';

// Exported so the card's `sx` and this module cannot drift apart: the card
// spreads these, the hook feeds the variables inside them.
export const DRAG_TRANSFORM = `translate3d(var(${OFFSET_X_VAR}, 0px), var(${OFFSET_Y_VAR}, 0px), 0)`;
export const DRAG_TRANSITION = `transform var(${SLIDE_VAR}, 0ms) ease`;

// Where the dragged card has to be pushed so it stays pinned under the pointer.
// `natural` is the rectangle the card occupies with no offset applied, which
// changes every time the grid reflows around the drag — feeding the fresh one
// in is what keeps the card from jumping when the notes reorder mid-drag.
export function dragTranslate(pointer, grabOffset, natural) {
  return {
    x: pointer.x - grabOffset.x - natural.left,
    y: pointer.y - grabOffset.y - natural.top,
  };
}

// How far the pointer sits inside the card when the drag starts, so the card
// keeps the same spot under the cursor instead of snapping its corner to it.
export function grabOffsetFor(pointer, rect) {
  return { x: pointer.x - rect.left, y: pointer.y - rect.top };
}

// FLIP inversion: for every card that moved between two snapshots, the offset
// that puts it back where it was. Animating those offsets to zero turns the
// instant grid reflow into a slide.
export function flipOffsets(previous, next, skipId) {
  const offsets = new Map();
  next.forEach((rect, id) => {
    if (id === skipId) return;
    const before = previous.get(id);
    if (!before) return;
    const dx = before.left - rect.left;
    const dy = before.top - rect.top;
    if (dx || dy) offsets.set(id, { dx, dy });
  });
  return offsets;
}
