import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, vi } from 'vitest';
import SceneViewport from './SceneViewport.jsx';

beforeAll(() => {
  // jsdom does not ship PointerEvent, while the real browser does. Using its
  // mouse-event shape gives pointer handlers the button coordinates they read.
  window.PointerEvent = MouseEvent;
});

function renderLaserViewport(onLaser) {
  const rendered = render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => false}
      fog={null}
      paintMode="laser"
      onLaser={onLaser}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );

  return {
    ...rendered,
    viewport: screen.getByText('Upload a map image to start building this scene.').parentElement,
  };
}

test('the selected laser follows pointer movement without a click', () => {
  const onLaser = vi.fn();
  const { viewport } = renderLaserViewport(onLaser);

  fireEvent.pointerMove(viewport, { clientX: 80, clientY: 60, pointerId: 1 });

  expect(onLaser).toHaveBeenCalledOnce();
  expect(onLaser).toHaveBeenCalledWith(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
});

test('clicking and releasing does not switch off a selected laser', () => {
  const onLaser = vi.fn();
  const { viewport } = renderLaserViewport(onLaser);

  fireEvent.pointerMove(viewport, { clientX: 80, clientY: 60, pointerId: 1 });
  onLaser.mockClear();
  fireEvent.pointerDown(viewport, { button: 0, clientX: 80, clientY: 60, pointerId: 1 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 80, clientY: 60, pointerId: 1 });

  expect(onLaser).toHaveBeenCalled();
  expect(onLaser).not.toHaveBeenCalledWith(null);
});

test('a stationary selected laser stays live', () => {
  vi.useFakeTimers();
  const onLaser = vi.fn();
  const { unmount, viewport } = renderLaserViewport(onLaser);

  fireEvent.pointerMove(viewport, { clientX: 80, clientY: 60, pointerId: 1 });
  const pointedAt = onLaser.mock.calls.at(-1)[0];
  onLaser.mockClear();
  act(() => vi.advanceTimersByTime(1000));

  expect(onLaser).toHaveBeenCalledWith(pointedAt);
  unmount();
  vi.useRealTimers();
});
