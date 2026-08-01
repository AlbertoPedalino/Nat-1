import React, { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useNoteDragReorder } from './useNoteDragReorder.js';
import { moveNoteTo } from '../logic/notes.js';
import { DRAG_TRANSFORM, OFFSET_X_VAR, OFFSET_Y_VAR, SLIDE_VAR } from '../logic/dragMotion.js';

// jsdom lays nothing out, so the board is described by hand: three cards of
// 180x100 in a row, 20px apart. Centres land at x = 90, 290, 490.
const CARD_WIDTH = 180;
const CARD_HEIGHT = 100;
const SLOT_PITCH = 200;

function slotRect(index) {
  const left = index * SLOT_PITCH;
  return {
    left,
    top: 0,
    right: left + CARD_WIDTH,
    bottom: CARD_HEIGHT,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    x: left,
    y: 0,
  };
}

// The rect is resolved at call time from the node's position among its
// siblings, so a reorder moves the slots exactly like a real grid would.
function stubLayout(container) {
  container.querySelectorAll('[data-card]').forEach((card) => {
    card.getBoundingClientRect = () => slotRect([...card.parentElement.children].indexOf(card));
  });
}

function Harness({ initialNotes, onReorder, onDrop }) {
  const [notes, setNotes] = useState(initialNotes);
  const { draggingId, registerCard, getHandleProps } = useNoteDragReorder({
    notes,
    onReorder: (id, index) => {
      onReorder?.(id, index);
      setNotes((current) => moveNoteTo(current, id, index));
    },
    onDrop,
  });

  return (
    <div data-testid="board">
      {notes.map((note) => (
        <div
          key={note.id}
          ref={(element) => registerCard(note.id, element)}
          data-card={note.id}
          data-testid={`card-${note.id}`}
          data-dragging={draggingId === note.id ? 'yes' : 'no'}
          style={{ transform: DRAG_TRANSFORM }}
        >
          <button type="button" aria-label={`handle-${note.id}`} {...getHandleProps(note.id)}>
            grip
          </button>
        </div>
      ))}
    </div>
  );
}

function renderBoard(overrides = {}) {
  const props = {
    initialNotes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    onReorder: vi.fn(),
    onDrop: vi.fn(),
    ...overrides,
  };
  const view = render(<Harness {...props} />);
  stubLayout(view.container);
  return { ...props, ...view };
}

const handleFor = (id) => screen.getByRole('button', { name: `handle-${id}` });
const cardFor = (id) => screen.getByTestId(`card-${id}`);
const offsetOf = (element) => [
  element.style.getPropertyValue(OFFSET_X_VAR),
  element.style.getPropertyValue(OFFSET_Y_VAR),
];

// jsdom has no PointerEvent, and the plain Event that fireEvent falls back to
// carries neither `button` nor the coordinates the hook reads — so the events
// are built by hand.
function pointer(type, props = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(event, { button: 0, pointerId: 1, ...props });
}

// The drag hook writes styles outside React, so a pointer sequence has to be
// wrapped in act() for the reorder it triggers to be committed before asserting.
function drag(id, steps) {
  const handle = handleFor(id);
  act(() => {
    fireEvent(handle, pointer('pointerdown', { clientX: steps[0].x, clientY: steps[0].y }));
  });
  steps.slice(1).forEach((step) => {
    act(() => {
      fireEvent(handle, pointer('pointermove', { clientX: step.x, clientY: step.y }));
    });
  });
  return handle;
}

async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

describe('useNoteDragReorder', () => {
  test('pins the dragged card under the pointer', () => {
    renderBoard();
    // Grabbed 20px inside the first card, then moved 100px right and 40px down.
    drag('a', [{ x: 20, y: 20 }, { x: 120, y: 60 }]);
    expect(offsetOf(cardFor('a'))).toEqual(['100px', '40px']);
    expect(cardFor('a')).toHaveAttribute('data-dragging', 'yes');
  });

  test('drops onto the card the pointer is over', () => {
    const { onReorder } = renderBoard();
    // Past the centre of the last slot (490), so the note lands after it.
    drag('a', [{ x: 20, y: 20 }, { x: 500, y: 50 }]);
    expect(onReorder).toHaveBeenCalledWith('a', 2);
  });

  test('keeps resolving drop targets after the card has moved under the pointer', () => {
    const { onReorder } = renderBoard();
    // The regression this guards: measuring the dragged card where it is drawn
    // instead of the slot it left makes it the nearest card to its own pointer,
    // and the board then never reorders again after the first step.
    drag('a', [{ x: 20, y: 20 }, { x: 500, y: 50 }, { x: 20, y: 50 }]);
    expect(onReorder).toHaveBeenNthCalledWith(1, 'a', 2);
    expect(onReorder).toHaveBeenNthCalledWith(2, 'a', 0);
  });

  test('re-pins the dragged card to its new slot so it does not jump on reorder', () => {
    renderBoard();
    drag('a', [{ x: 20, y: 20 }, { x: 500, y: 50 }]);
    // 'a' now owns the third slot (left 400) but the pointer has not moved, so
    // the offset has to absorb the 400px jump and leave the card where it is.
    expect(offsetOf(cardFor('a'))).toEqual(['80px', '30px']);
  });

  test('slides the displaced cards with a FLIP instead of snapping them', async () => {
    renderBoard();
    drag('a', [{ x: 20, y: 20 }, { x: 500, y: 50 }]);

    // Inverted first: 'b' and 'c' each shifted one slot left, so they are pushed
    // back the same 200px with no transition.
    expect(offsetOf(cardFor('b'))).toEqual(['200px', '0px']);
    expect(cardFor('b').style.getPropertyValue(SLIDE_VAR)).toBe('0ms');

    await flushFrame();
    expect(offsetOf(cardFor('b'))).toEqual(['0px', '0px']);
    expect(cardFor('b').style.getPropertyValue(SLIDE_VAR)).toBe('180ms');
    expect(offsetOf(cardFor('c'))).toEqual(['0px', '0px']);
  });

  test('releases the card into its slot and reports the drop once', () => {
    const { onDrop } = renderBoard();
    const handle = drag('a', [{ x: 20, y: 20 }, { x: 500, y: 50 }]);
    act(() => { fireEvent(handle, pointer('pointerup')); });

    expect(offsetOf(cardFor('a'))).toEqual(['0px', '0px']);
    expect(cardFor('a').style.getPropertyValue(SLIDE_VAR)).toBe('180ms');
    expect(cardFor('a')).toHaveAttribute('data-dragging', 'no');
    expect(onDrop).toHaveBeenCalledOnce();
    expect(onDrop).toHaveBeenCalledWith('a');

    // A stray pointerup after the drag ended must not report a second drop.
    act(() => { fireEvent(handle, pointer('pointerup')); });
    expect(onDrop).toHaveBeenCalledOnce();
  });

  test('survives losing pointer capture, which reordering always causes', () => {
    const { onReorder } = renderBoard();
    const handle = drag('a', [{ x: 20, y: 20 }, { x: 500, y: 50 }]);
    // Reordering moves the card's node, and a moved node loses its pointer
    // capture. A drag that listened for that event ended right there — one slot
    // into the gesture, every time.
    act(() => { fireEvent(handle, pointer('lostpointercapture')); });

    act(() => { fireEvent(handle, pointer('pointermove', { clientX: 20, clientY: 50 })); });
    expect(onReorder).toHaveBeenLastCalledWith('a', 0);
    expect(cardFor('a')).toHaveAttribute('data-dragging', 'yes');
  });

  test('a press that reorders nothing is not reported as a drop', () => {
    const { onDrop } = renderBoard();
    // Grabbed and released inside its own slot: nothing moved, so the live
    // region has nothing to say.
    const handle = drag('a', [{ x: 20, y: 20 }, { x: 30, y: 25 }]);
    act(() => { fireEvent(handle, pointer('pointerup')); });
    expect(onDrop).not.toHaveBeenCalled();
  });

  test('ignores non-primary buttons and moves without a drag', () => {
    const { onReorder } = renderBoard();
    const handle = handleFor('a');
    act(() => {
      fireEvent(handle, pointer('pointerdown', { button: 2, clientX: 20, clientY: 20 }));
      fireEvent(handle, pointer('pointermove', { clientX: 500, clientY: 50 }));
    });
    expect(onReorder).not.toHaveBeenCalled();
    expect(offsetOf(cardFor('a'))).toEqual(['', '']);
  });
});
