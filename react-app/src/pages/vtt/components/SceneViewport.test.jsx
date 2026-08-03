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

test('an external piece is shown at map scale and dropped on the hovered cell', () => {
  const placementDrag = {
    kind: 'monster',
    count: 2,
    token: { label: 'Ogre', color: '#7a5a30', w: 2, h: 2, layer: 'tokens' },
  };
  const onDropPlacement = vi.fn();
  const { container } = render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => false}
      fog={null}
      placementDrag={placementDrag}
      onDropPlacement={onDropPlacement}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const dataTransfer = { dropEffect: '', getData: vi.fn(() => '') };

  fireEvent.dragOver(viewport, { clientX: 150, clientY: 120, dataTransfer });
  expect(container.querySelector('[data-placement-preview]')).toBeTruthy();
  expect(screen.getByText('×2')).toBeTruthy();

  fireEvent.drop(viewport, { clientX: 150, clientY: 120, dataTransfer });
  expect(onDropPlacement).toHaveBeenCalledWith(
    placementDrag,
    expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
  );
});

test('a Lucide map object persists its resized cell dimensions on release', () => {
  const onResizeToken = vi.fn();
  render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[{
        id: 'door-1', iconKey: 'door-open', label: 'Open door', layer: 'map', x: 0, y: 0, w: 1, h: 1,
      }]}
      snap
      canMove={() => true}
      fog={null}
      onResizeToken={onResizeToken}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const handle = screen.getByRole('button', { name: 'Resize Open door' });

  fireEvent.pointerDown(handle, { button: 0, clientX: 50, clientY: 50, pointerId: 7 });
  fireEvent.pointerMove(viewport, { clientX: 100, clientY: 75, pointerId: 7 });
  fireEvent.pointerUp(viewport, { clientX: 100, clientY: 75, pointerId: 7 });

  expect(onResizeToken).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'door-1' }),
    { w: 2, h: 1.5 },
  );
});

test('a Lucide map object persists rotation around its centre on release', () => {
  const onRotateToken = vi.fn();
  render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[{
        id: 'door-rotate', iconKey: 'door-open', label: 'Open door', layer: 'map',
        x: 0, y: 0, w: 1, h: 1, rotation: 0,
      }]}
      snap
      canMove={() => true}
      fog={null}
      onRotateToken={onRotateToken}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const handle = screen.getByRole('button', { name: 'Rotate Open door' });

  fireEvent.pointerDown(handle, { button: 0, clientX: 50, clientY: 25, pointerId: 8 });
  fireEvent.pointerMove(viewport, { clientX: 25, clientY: 50, pointerId: 8 });
  fireEvent.pointerUp(viewport, { clientX: 25, clientY: 50, pointerId: 8 });

  expect(onRotateToken).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'door-rotate' }),
    { rotation: 90 },
  );
});

test('fullscreen exposes a sheet button and opens the sheet inside the viewport', () => {
  const onFullscreenChange = vi.fn();
  const onSelectionChange = vi.fn();
  render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => false}
      fog={null}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
      onFullscreenChange={onFullscreenChange}
      fullscreenSheet={{
        choices: [
          { characterId: 'aria', name: 'Aria' },
          { characterId: 'borin', name: 'Borin' },
        ],
        selectedId: 'aria',
        onSelectionChange,
        content: <div>Aria character sheet</div>,
      }}
    />,
  );

  expect(screen.queryByRole('button', { name: 'Show floating character sheet' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fullscreen map' }));
  expect(onFullscreenChange).toHaveBeenLastCalledWith(true);

  fireEvent.click(screen.getByRole('button', { name: 'Show floating character sheet' }));
  const sheetContent = screen.getByText('Aria character sheet');
  expect(sheetContent).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close floating sheet' })).toBeInTheDocument();

  const sheetWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
  fireEvent(sheetContent, sheetWheel);
  expect(sheetWheel.defaultPrevented).toBe(false);

  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const mapWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
  fireEvent(viewport, mapWheel);
  expect(mapWheel.defaultPrevented).toBe(true);

  fireEvent.change(screen.getByRole('combobox', { name: 'Character sheet' }), { target: { value: 'borin' } });
  expect(onSelectionChange).toHaveBeenCalledWith('borin');
});
