import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, vi } from 'vitest';
import FloatingSheetPanel from './FloatingSheetPanel.jsx';

beforeAll(() => {
  window.PointerEvent = MouseEvent;
});

// The panel now remembers where it was put, so one test's window would
// otherwise decide where the next one opens.
beforeEach(() => {
  window.sessionStorage.clear();
});

function mapOf(width, height, border = 0) {
  const container = document.createElement('div');
  container.getBoundingClientRect = vi.fn(() => ({
    left: 0, top: 0, right: width, bottom: height, width, height,
  }));
  // The real map host is a bordered box, and jsdom always reports zero here.
  Object.defineProperty(container, 'clientLeft', { value: border });
  Object.defineProperty(container, 'clientTop', { value: border });
  return { current: container };
}

// A rect that follows the inline styles the component writes. Pinning it to a
// constant would let these tests pass even if the panel never moved, which is
// exactly what they are here to catch.
//
// An absolutely positioned child's `left` is relative to the container's
// padding box, while `getBoundingClientRect` reports a border box, so the
// border has to be added back here or the stub would model a browser that does
// not exist — and would then blame the component for its own arithmetic.
function trackPanelRect(panel, base, containerRef = null) {
  const container = containerRef?.current;
  const box = container?.getBoundingClientRect();
  const originX = container ? box.left + container.clientLeft : 0;
  const originY = container ? box.top + container.clientTop : 0;
  const read = (name, origin, fallback) => (
    panel.style[name] ? origin + Number.parseFloat(panel.style[name]) : fallback
  );
  panel.getBoundingClientRect = () => {
    const left = read('left', originX, base.left);
    const top = read('top', originY, base.top);
    const width = read('width', 0, base.width);
    const height = read('height', 0, base.height);
    return {
      left, top, width, height, right: left + width, bottom: top + height,
    };
  };
  return panel;
}

function openSheet(containerRef) {
  return render(
    <FloatingSheetPanel
      choices={[{ characterId: 'aria', name: 'Aria' }]}
      selectedId="aria"
      onSelectionChange={() => {}}
      onClose={() => {}}
      containerRef={containerRef}
    >
      <div>Character content</div>
    </FloatingSheetPanel>,
  );
}

test('the fullscreen sheet panel can move partly outside the map and be resized', async () => {
  const container = document.createElement('div');
  const containerRef = { current: container };
  container.getBoundingClientRect = vi.fn(() => ({
    left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
  }));

  const { container: rendered } = render(
    <FloatingSheetPanel
      choices={[{ characterId: 'aria', name: 'Aria' }]}
      selectedId="aria"
      onSelectionChange={() => {}}
      onClose={() => {}}
      containerRef={containerRef}
    >
      <div>Character content</div>
    </FloatingSheetPanel>,
  );

  const panel = rendered.querySelector('[data-floating-sheet]');
  panel.getBoundingClientRect = vi.fn(() => ({
    left: 168, top: 50, right: 788, bottom: 470, width: 620, height: 420,
  }));
  const handle = screen.getByText('Sheet').parentElement;

  fireEvent.pointerDown(handle, { button: 0, pointerId: 4, clientX: 200, clientY: 60 });
  fireEvent.pointerMove(handle, { pointerId: 4, clientX: 300, clientY: 160 });
  fireEvent.pointerUp(handle, { pointerId: 4, clientX: 300, clientY: 160 });

  await waitFor(() => {
    expect(panel.style.left).toBe('268px');
    expect(panel.style.top).toBe('150px');
    expect(panel.style.right).toBe('auto');
  });

  const resize = screen.getByRole('button', { name: 'Resize floating sheet' });
  fireEvent.pointerDown(resize, { button: 0, pointerId: 5, clientX: 300, clientY: 200 });
  fireEvent.pointerMove(resize, { pointerId: 5, clientX: 400, clientY: 300 });
  fireEvent.pointerUp(resize, { pointerId: 5, clientX: 400, clientY: 300 });

  await waitFor(() => {
    expect(panel.style.width).toBe('720px');
    expect(panel.style.height).toBe('520px');
  });
});

test('a sheet that was moved comes back where it was left', async () => {
  const containerRef = mapOf(800, 600);
  const first = openSheet(containerRef);
  trackPanelRect(
    first.container.querySelector('[data-floating-sheet]'),
    { left: 168, top: 50, width: 620, height: 420 },
  );

  const handle = screen.getByText('Sheet').parentElement;
  fireEvent.pointerDown(handle, { button: 0, pointerId: 7, clientX: 300, clientY: 120 });
  fireEvent.pointerMove(handle, { pointerId: 7, clientX: 340, clientY: 160 });
  fireEvent.pointerUp(handle, { pointerId: 7, clientX: 340, clientY: 160 });

  // The dragged-to position, not whatever the element happened to measure.
  const stored = JSON.parse(window.sessionStorage.getItem('gb-vtt-sheet-frame'));
  expect(stored).toEqual({ left: 208, top: 90, width: null, height: null });

  first.unmount();

  const reopened = openSheet(containerRef).container.querySelector('[data-floating-sheet]');
  expect(reopened.style.left).toBe('208px');
  expect(reopened.style.top).toBe('90px');
  expect(reopened.style.right).toBe('auto');
  // Moving a window says nothing about how big it should be, so the responsive
  // default is left alone.
  expect(reopened.style.width).toBe('');
  expect(reopened.style.height).toBe('');
});

test('a sheet that was resized comes back at that size', () => {
  const containerRef = mapOf(800, 600);
  const first = openSheet(containerRef);
  trackPanelRect(
    first.container.querySelector('[data-floating-sheet]'),
    { left: 168, top: 50, width: 620, height: 420 },
  );

  const resize = screen.getByRole('button', { name: 'Resize floating sheet' });
  fireEvent.pointerDown(resize, { button: 0, pointerId: 8, clientX: 300, clientY: 200 });
  fireEvent.pointerMove(resize, { pointerId: 8, clientX: 400, clientY: 300 });
  fireEvent.pointerUp(resize, { pointerId: 8, clientX: 400, clientY: 300 });

  expect(JSON.parse(window.sessionStorage.getItem('gb-vtt-sheet-frame'))).toEqual({
    left: 168, top: 50, width: 720, height: 520,
  });

  first.unmount();

  const reopened = openSheet(containerRef).container.querySelector('[data-floating-sheet]');
  expect(reopened.style.width).toBe('720px');
  expect(reopened.style.height).toBe('520px');
});

test('a sheet remembered from a bigger window is fitted to this one', () => {
  window.sessionStorage.setItem('gb-vtt-sheet-frame', JSON.stringify({
    left: 2000, top: 1500, width: 3000, height: 2000,
  }));

  const { container: rendered } = openSheet(mapOf(800, 600));
  const panel = rendered.querySelector('[data-floating-sheet]');
  // Fitted to the map rather than thrown away, and still catchable by its grip.
  expect(panel.style.width).toBe('752px');
  expect(panel.style.height).toBe('552px');
  expect(panel.style.left).toBe('704px');
  expect(panel.style.top).toBe('560px');
});

test('the container border does not push the sheet along on every reopen', () => {
  // `getBoundingClientRect` is border-box, but an absolutely positioned child
  // is placed against the padding box. The map host has a 1px border, so a
  // stored offset that ignores it lands one pixel further in each cycle, and
  // the error accumulates for as long as the session lasts.
  const containerRef = mapOf(800, 600, 1);
  const first = openSheet(containerRef);
  trackPanelRect(
    first.container.querySelector('[data-floating-sheet]'),
    { left: 168, top: 50, width: 620, height: 420 },
    containerRef,
  );

  const handle = screen.getByText('Sheet').parentElement;
  fireEvent.pointerDown(handle, { button: 0, pointerId: 9, clientX: 300, clientY: 120 });
  fireEvent.pointerMove(handle, { pointerId: 9, clientX: 340, clientY: 160 });
  fireEvent.pointerUp(handle, { pointerId: 9, clientX: 340, clientY: 160 });

  const stored = JSON.parse(window.sessionStorage.getItem('gb-vtt-sheet-frame'));
  expect(stored.left).toBe(207);
  expect(stored.top).toBe(89);

  // And it stays put: reopening and moving by nothing must not shift it again.
  first.unmount();
  const second = openSheet(containerRef);
  trackPanelRect(
    second.container.querySelector('[data-floating-sheet]'),
    { left: 208, top: 90, width: 620, height: 420 },
    containerRef,
  );
  const grip = screen.getByText('Sheet').parentElement;
  fireEvent.pointerDown(grip, { button: 0, pointerId: 10, clientX: 300, clientY: 120 });
  fireEvent.pointerMove(grip, { pointerId: 10, clientX: 300, clientY: 120 });
  fireEvent.pointerUp(grip, { pointerId: 10, clientX: 300, clientY: 120 });

  expect(JSON.parse(window.sessionStorage.getItem('gb-vtt-sheet-frame')).left).toBe(207);
});

test('a truncated entry is ignored instead of pinning the sheet to the corner', () => {
  // What a half-written or hand-edited storage value looks like. Coercing these
  // to zero would silently place the panel at the top-left of the map.
  window.sessionStorage.setItem('gb-vtt-sheet-frame', JSON.stringify({
    left: null, top: null, width: 500, height: 400,
  }));

  const { container: rendered } = openSheet(mapOf(800, 600));
  const panel = rendered.querySelector('[data-floating-sheet]');
  expect(panel.style.left).toBe('');
  expect(panel.style.top).toBe('');
});

test('a sheet nobody has moved yet keeps its default corner', () => {
  const { container: rendered } = openSheet(mapOf(800, 600));
  const panel = rendered.querySelector('[data-floating-sheet]');
  // Untouched inline styles, so the responsive CSS defaults still apply.
  expect(panel.style.left).toBe('');
  expect(panel.style.width).toBe('');
  expect(panel.style.right).toBe('');
});
