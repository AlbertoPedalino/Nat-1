import test from 'node:test';
import assert from 'node:assert/strict';
import { centerInScroller } from '../../../../src/shared/ui/scrollReveal.js';

// A scroller laid out at `start` on its axis, `size` long, holding `content`,
// already scrolled by `scrolled`; an item at `itemStart` on screen, `itemSize`
// long. Records a smooth scroll instead of performing it.
function scroller({ axis = 'y', size = 200, content = 1000, scrolled = 0, start = 100 } = {}) {
  const vertical = axis === 'y';
  const node = {
    smooth: null,
    clientHeight: vertical ? size : 40,
    clientWidth: vertical ? 300 : size,
    scrollHeight: vertical ? content : 40,
    scrollWidth: vertical ? 300 : content,
    scrollTop: vertical ? scrolled : 0,
    scrollLeft: vertical ? 0 : scrolled,
    getBoundingClientRect: () => ({ top: vertical ? start : 0, left: vertical ? 0 : start }),
    scrollTo(options) { this.smooth = options; },
  };
  return node;
}

function item({ axis = 'y', itemStart, itemSize = 40 }) {
  const vertical = axis === 'y';
  return {
    offsetHeight: vertical ? itemSize : 20,
    offsetWidth: vertical ? 100 : itemSize,
    getBoundingClientRect: () => ({ top: vertical ? itemStart : 0, left: vertical ? 0 : itemStart }),
  };
}

test('an item is brought to the middle of its column at once', () => {
  const box = scroller({ scrolled: 50 });
  // On screen 400px below the box's top, i.e. 450px into its content: centred
  // means 450 - (200 - 40) / 2 = 370.
  centerInScroller(box, item({ itemStart: 500 }));
  assert.equal(box.scrollTop, 370);
  assert.equal(box.smooth, null);
});

test('a strip scrolls sideways', () => {
  const strip = scroller({ axis: 'x', size: 300 });
  centerInScroller(strip, item({ axis: 'x', itemStart: 700, itemSize: 60 }), { axis: 'x' });
  assert.equal(strip.scrollLeft, 600 - (300 - 60) / 2);
});

test('smooth glides there through scrollTo', () => {
  const box = scroller();
  centerInScroller(box, item({ itemStart: 500 }), { smooth: true });
  assert.deepEqual(box.smooth, { top: 400 - 80, behavior: 'smooth' });
  assert.equal(box.scrollTop, 0);
});

test('an item near the top never scrolls past the start', () => {
  const box = scroller();
  centerInScroller(box, item({ itemStart: 110 }));
  assert.equal(box.scrollTop, 0);
});

test('nothing moves when the box has nothing to scroll or is not laid out', () => {
  const short = scroller({ content: 150 });
  centerInScroller(short, item({ itemStart: 200 }));
  assert.equal(short.scrollTop, 0);

  const hidden = scroller({ size: 0 });
  centerInScroller(hidden, item({ itemStart: 200 }));
  assert.equal(hidden.scrollTop, 0);

  assert.doesNotThrow(() => centerInScroller(null, null));
});
