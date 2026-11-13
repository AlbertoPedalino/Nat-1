// Brings `item` to the middle of the box that scrolls it, `scroller`: the
// current one of a scrolling list (the choice made in a ScrollWell, the
// combatant whose turn it is in the encounter's roster and in the map's
// initiative strip) kept in view. Only that box scrolls, never the page or any
// box around it: scrollIntoView moved them all — the map jumped to follow the
// piece on every turn.
//
// `axis` is 'y' (a column) or 'x' (a strip). `smooth` glides there, for a
// change the eye is following (the next turn); without it, or when the
// viewer asked for less motion, it is there at once (a list opening on its
// choice). Nothing happens while the box is not laid out or has nothing to
// scroll.
export function centerInScroller(scroller, item, { axis = 'y', smooth = false } = {}) {
  if (!scroller || !item) return;
  const vertical = axis === 'y';
  const size = vertical ? scroller.clientHeight : scroller.clientWidth;
  const content = vertical ? scroller.scrollHeight : scroller.scrollWidth;
  if (!size || content <= size) return;

  const start = vertical ? 'top' : 'left';
  const scrolled = vertical ? scroller.scrollTop : scroller.scrollLeft;
  const itemSize = vertical ? item.offsetHeight : item.offsetWidth;
  const offset = item.getBoundingClientRect()[start] - scroller.getBoundingClientRect()[start] + scrolled;
  const target = Math.max(0, offset - (size - itemSize) / 2);

  const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (smooth && !reduceMotion && typeof scroller.scrollTo === 'function') {
    scroller.scrollTo({ [start]: target, behavior: 'smooth' });
  } else if (vertical) {
    scroller.scrollTop = target;
  } else {
    scroller.scrollLeft = target;
  }
}
