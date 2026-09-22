import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, vi } from 'vitest';
import SceneViewport from '../../../../../src/pages/vtt/map/SceneViewport.jsx';
import { PIECE_POINTER_DRAG_EVENT } from '../../../../../src/pages/vtt/tokens/PiecePreview.jsx';
import HexGrid from '../../../../../src/pages/vtt/map/HexGrid.jsx';
import SquareGrid from '../../../../../src/pages/vtt/map/SquareGrid.jsx';
import { createFog } from '../../../../../src/shared/vtt/map/fog.js';

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

test('the space around a battlemap is the same black as covered fog', () => {
  const { viewport } = renderLaserViewport(vi.fn());

  expect(viewport).toHaveStyle({ backgroundColor: '#000000' });
});

test.each([false, true])('all party pieces paint above fog while monsters stay hidden (projector: %s)', (projector) => {
  const { container } = render(<SceneViewport
    scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
    tokens={[
      { id: 'mine', label: 'My hero', characterId: 'hero', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 },
      { id: 'other', label: 'Other hero', characterId: 'other', layer: 'tokens', x: 2, y: 1, w: 1, h: 1 },
      { id: 'monster', label: 'Goblin', layer: 'tokens', x: 3, y: 1, w: 1, h: 1 },
    ]}
    canMove={(token) => !projector && token.id === 'mine'}
    canSeeThroughFog={projector ? undefined : (token) => token.id === 'mine'}
    cameraLocked={projector}
    fog={createFog(6, 5, 1)}
    fogOnTop
    fogOpacity={1}
  />);
  const fog = container.querySelector('[data-fog-layer="public"]');
  expect(screen.queryByRole('button', { name: 'Goblin' })).not.toBeInTheDocument();
  for (const name of ['My hero', 'Other hero']) {
    const piece = screen.getByRole('button', { name }).parentElement;
    expect(Number(getComputedStyle(piece).zIndex)).toBeGreaterThanOrEqual(Number(getComputedStyle(fog).zIndex));
    expect(fog.compareDocumentPosition(piece) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
});

test.each([false, true])('public atmosphere stays above fog and below the laser (camera locked: %s)', async (cameraLocked) => {
  // Exercise the static fallback too: it must have the same stacking behavior
  // as the WebGL surface on machines without GPU rendering.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const { container } = render(
    <SceneViewport
      scene={{ grid: { size: 40, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[]}
      canMove={() => false}
      fog={createFog(40, 40)}
      fogOnTop
      fogOpacity={1}
      cameraLocked={cameraLocked}
      atmosphere={{ type: 'rain', intensity: 0.8 }}
      drawings={[]}
      lasers={[{ id: 'gm-laser', x: 1, y: 1, label: 'GM' }]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const fog = container.querySelector('[data-fog-layer="public"]');
  const weather = container.querySelector('[data-atmosphere-overlay="rain"]');
  const laser = container.querySelector('[data-remote-laser="true"]').parentElement;
  await waitFor(() => expect(weather.tagName).toBe('DIV'));

  const paintsAbove = (front, back) => {
    const frontLayer = Number(getComputedStyle(front).zIndex) || 0;
    const backLayer = Number(getComputedStyle(back).zIndex) || 0;
    return frontLayer > backLayer || (frontLayer === backLayer
      && Boolean(back.compareDocumentPosition(front) & Node.DOCUMENT_POSITION_FOLLOWING));
  };
  expect(paintsAbove(weather, fog)).toBe(true);
  expect(paintsAbove(laser, weather)).toBe(true);
  expect(weather).toHaveStyle({ pointerEvents: 'none' });
  expect(screen.getByRole('button', { name: 'Fullscreen map' })).toBeEnabled();
});

test.each(['reveal', 'hide'])('the %s brush joins fast diagonal moves and resets between strokes', (paintMode) => {
  const onPaint = vi.fn();
  const onPaintEnd = vi.fn();
  render(
    <SceneViewport
      scene={{ grid: { size: 40, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[]}
      canMove={() => false}
      fog={createFog(40, 40)}
      paintMode={paintMode}
      brushSize={1}
      onPaint={onPaint}
      onPaintEnd={onPaintEnd}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  fireEvent.pointerDown(viewport, { button: 0, clientX: 25, clientY: 25 });
  fireEvent.pointerMove(viewport, { clientX: 185, clientY: 185 });
  const [cells, revealed] = onPaint.mock.calls.at(-1);
  expect(revealed).toBe(paintMode === 'reveal');
  for (let index = 2; index <= 18; index += 1) {
    expect(cells).toContainEqual({ col: index, row: index });
  }
  fireEvent.pointerUp(viewport, { clientX: 185, clientY: 185 });
  expect(onPaintEnd).toHaveBeenCalledOnce();
  fireEvent.pointerDown(viewport, { button: 0, clientX: 325, clientY: 25 });
  const [newStroke] = onPaint.mock.calls.at(-1);
  expect(newStroke).toContainEqual({ col: 32, row: 2 });
  expect(newStroke).not.toContainEqual({ col: 25, row: 10 });
});

test.each(['reveal', 'hide'])('fractional %s brushes shrink both the preview and the painted area', (paintMode) => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const onPaint = vi.fn();
  const props = {
    scene: { grid: { size: 40, offsetX: 0, offsetY: 0, visible: false }, playArea: null },
    imageUrl: null,
    tokens: [],
    canMove: () => false,
    fog: createFog(40, 40),
    paintMode,
    onPaint,
    drawings: [],
    lasers: [],
    rollBubbles: [],
    diceThrows: [],
  };
  const { container, rerender } = render(<SceneViewport {...props} brushSize={1} />);
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const painted = [];
  for (const [brushSize, diameter, cellCount] of [[1, 40, 13], [0.5, 20, 5], [0.25, 10, 1]]) {
    rerender(<SceneViewport {...props} brushSize={brushSize} />);
    fireEvent.pointerMove(viewport, { clientX: 25, clientY: 25 });
    expect(container.querySelector('[data-brush-preview]')).toHaveStyle({ width: `${diameter}px`, height: `${diameter}px` });
    fireEvent.pointerDown(viewport, { button: 0, clientX: 25, clientY: 25 });
    const [cells, revealed] = onPaint.mock.calls.at(-1);
    expect(revealed).toBe(paintMode === 'reveal');
    expect(cells).toHaveLength(cellCount);
    expect(cells).toContainEqual({ col: 2, row: 2 });
    painted.push(cells);
    fireEvent.pointerUp(viewport, { clientX: 25, clientY: 25 });
  }
  expect(painted[0]).toEqual(expect.arrayContaining(painted[1]));
  expect(painted[1]).toEqual(expect.arrayContaining(painted[2]));

  // Old one-cell-per-square fog cannot paint a fraction of its stored cell.
  rerender(<SceneViewport {...props} fog={createFog(10, 10, 1)} brushSize={0.5} />);
  expect(container.querySelector('[data-brush-preview]')).toHaveStyle({ width: '40px', height: '40px' });
});

test('the square grid stays aligned to cell coordinates at fractional zoom', () => {
  const { container } = render(
    <SquareGrid
      grid={{ size: 50, offsetX: 10, offsetY: 20 }}
      view={{ x: 3, y: 4, zoom: 1.125 }}
      viewportSize={{ width: 400, height: 300 }}
      lineColor="#3aa0ff40"
      lineWidth={3}
    />,
  );

  const path = container.querySelector('[data-square-grid] path');
  // Origin: offset * zoom + pan. The next lines use exactly the same scaled
  // cell step as a token at column/row 1, including a non-integer zoom.
  expect(path.getAttribute('d')).toContain('M14.25 0V300');
  expect(path.getAttribute('d')).toContain('M70.5 0V300');
  expect(path.getAttribute('d')).toContain('M0 26.5H400');
  expect(path).toHaveAttribute('stroke', '#3aa0ff40');
  expect(path).toHaveAttribute('stroke-width', '3');
});

test('the selected laser follows pointer movement without a click', () => {
  const onLaser = vi.fn();
  const { viewport } = renderLaserViewport(onLaser);

  fireEvent.pointerMove(viewport, { clientX: 80, clientY: 60, pointerId: 1 });

  expect(onLaser).toHaveBeenCalledOnce();
  expect(onLaser).toHaveBeenCalledWith(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
});

test('the local laser keeps following pointer frames between throttled broadcasts', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000);
  const onLaser = vi.fn();
  const { container, viewport } = renderLaserViewport(onLaser);
  const dot = container.querySelector('[data-local-laser="true"]');

  fireEvent.pointerMove(viewport, { clientX: 80, clientY: 60, pointerId: 1 });
  await waitFor(() => expect(dot.style.transform).not.toBe(''));
  const firstTransform = dot.style.transform;

  onLaser.mockClear();
  fireEvent.pointerMove(viewport, { clientX: 120, clientY: 60, pointerId: 1 });

  // The second event is inside the 50 ms network window, but the local ref is
  // still consumed by the overlay on its next animation frame.
  expect(onLaser).not.toHaveBeenCalled();
  await waitFor(() => expect(dot.style.transform).not.toBe(firstTransform));
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

test('a touch placement crosses tool overlays and drops at the release point', () => {
  const placement = {
    kind: 'object',
    object: { key: 'door-open', label: 'Door' },
    token: { iconKey: 'door-open', label: 'Door', w: 1, h: 1, layer: 'map' },
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
      placementDrag={placement}
      onDropPlacement={onDropPlacement}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  viewport.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 320, bottom: 240, width: 320, height: 240,
  });

  act(() => window.dispatchEvent(new CustomEvent(PIECE_POINTER_DRAG_EVENT, {
    detail: { phase: 'move', placement, clientX: 140, clientY: 110 },
  })));
  expect(container.querySelector('[data-placement-preview]')).toBeTruthy();
  expect(container.querySelector('[data-placement-target-hint]')).toHaveTextContent('Release on the map to place');

  act(() => window.dispatchEvent(new CustomEvent(PIECE_POINTER_DRAG_EVENT, {
    detail: { phase: 'drop', placement, clientX: 160, clientY: 130 },
  })));
  expect(onDropPlacement).toHaveBeenCalledWith(
    placement,
    expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
  );
});

test('the background refuses piece placement', () => {
  const placementDrag = {
    kind: 'character',
    characterId: 'hero-1',
    token: { label: 'Aria', w: 1, h: 1, layer: 'tokens' },
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
      backgroundOnly
      placementDrag={placementDrag}
      onDropPlacement={onDropPlacement}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const dataTransfer = { dropEffect: '' };

  fireEvent.dragOver(viewport, { clientX: 150, clientY: 120, dataTransfer });
  fireEvent.drop(viewport, { clientX: 150, clientY: 120, dataTransfer });

  expect(dataTransfer.dropEffect).toBe('none');
  expect(container.querySelector('[data-placement-preview]')).toBeNull();
  expect(onDropPlacement).not.toHaveBeenCalled();
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
  const object = screen.getByRole('button', { name: 'Open door' });

  fireEvent.pointerDown(object, { button: 0, clientX: 25, clientY: 25, pointerId: 6 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 25, clientY: 25, pointerId: 6 });
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
  const object = screen.getByRole('button', { name: 'Open door' });

  fireEvent.pointerDown(object, { button: 0, clientX: 25, clientY: 25, pointerId: 7 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 25, clientY: 25, pointerId: 7 });
  const handle = screen.getByRole('button', { name: 'Rotate Open door' });

  fireEvent.pointerDown(handle, { button: 0, clientX: 50, clientY: 25, pointerId: 8 });
  fireEvent.pointerMove(viewport, { clientX: 25, clientY: 50, pointerId: 8 });
  fireEvent.pointerUp(viewport, { clientX: 25, clientY: 50, pointerId: 8 });

  expect(onRotateToken).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'door-rotate' }),
    { rotation: 90 },
  );
});

test('map object resize and rotation controls only appear on the selected icon', () => {
  render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[
        { id: 'door-1', iconKey: 'door-open', label: 'Open door', layer: 'map', x: 0, y: 0, w: 1, h: 1 },
        { id: 'window-1', iconKey: 'panels-top-left', label: 'Window', layer: 'map', x: 2, y: 0, w: 1, h: 1 },
      ]}
      snap
      canMove={() => true}
      fog={null}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;

  expect(screen.queryByRole('button', { name: 'Resize Open door' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Rotate Window' })).toBeNull();

  fireEvent.pointerDown(screen.getByRole('button', { name: 'Open door' }), {
    button: 0, clientX: 25, clientY: 25, pointerId: 20,
  });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 25, clientY: 25, pointerId: 20 });

  expect(screen.getByRole('button', { name: 'Resize Open door' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Rotate Open door' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Resize Window' })).toBeNull();

  fireEvent.pointerDown(screen.getByRole('button', { name: 'Window' }), {
    button: 0, clientX: 125, clientY: 25, pointerId: 21,
  });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 125, clientY: 25, pointerId: 21 });

  expect(screen.queryByRole('button', { name: 'Resize Open door' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Resize Window' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Rotate Window' })).toBeTruthy();

  fireEvent.pointerDown(viewport, { button: 0, clientX: 300, clientY: 200, pointerId: 22 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 300, clientY: 200, pointerId: 22 });

  expect(screen.queryByRole('button', { name: 'Resize Window' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Rotate Window' })).toBeNull();
});

function renderPicture({ onResizeToken, grid }) {
  render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false, ...grid }, playArea: null }}
      imageUrl={null}
      tokens={[{
        id: 'banner-1',
        label: 'Banner',
        layer: 'map',
        imagePath: 'camp/scene/banner.png',
        imageUrl: 'blob:banner',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
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

  // Selecting it is what puts the handles on it, exactly as for an icon.
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Banner' }), {
    button: 0, clientX: 20, clientY: 20, pointerId: 40,
  });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 20, clientY: 20, pointerId: 40 });
  return { viewport, handle: screen.getByRole('button', { name: 'Resize Banner' }) };
}

test('a picture is stretched on the axis the corner was pulled along', () => {
  const onResizeToken = vi.fn();
  const { viewport, handle } = renderPicture({ onResizeToken });

  // A cell to the right and nothing downwards: only the width moves. No
  // modifier is involved, because a tablet has no key to hold.
  fireEvent.pointerDown(handle, { button: 0, clientX: 200, clientY: 100, pointerId: 41 });
  fireEvent.pointerMove(viewport, { clientX: 250, clientY: 100, pointerId: 41 });
  fireEvent.pointerUp(viewport, { clientX: 250, clientY: 100, pointerId: 41 });

  expect(onResizeToken).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'banner-1' }),
    { w: 5, h: 2 },
  );
});

test('a picture pulled diagonally grows on both axes at once', () => {
  const onResizeToken = vi.fn();
  const { viewport, handle } = renderPicture({ onResizeToken });

  fireEvent.pointerDown(handle, { button: 0, clientX: 200, clientY: 100, pointerId: 42 });
  fireEvent.pointerMove(viewport, { clientX: 250, clientY: 150, pointerId: 42 });
  fireEvent.pointerUp(viewport, { clientX: 250, clientY: 150, pointerId: 42 });

  expect(onResizeToken).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'banner-1' }),
    { w: 5, h: 3 },
  );
});

test('with snapping off objects land between squares while creatures keep theirs', () => {
  const onMoveToken = vi.fn();
  render(
    <SceneViewport
      scene={{
        grid: {
          size: 50, offsetX: 0, offsetY: 0, visible: false, snapObjects: false,
        },
        playArea: null,
      }}
      imageUrl={null}
      tokens={[
        { id: 'door-1', iconKey: 'door-open', label: 'Open door', layer: 'tokens', x: 0, y: 0, w: 1, h: 1 },
        { id: 'ogre-1', label: 'Ogre', layer: 'tokens', x: 4, y: 0, w: 1, h: 1 },
      ]}
      snap
      canMove={() => true}
      fog={null}
      onMoveToken={onMoveToken}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;

  fireEvent.pointerDown(screen.getByRole('button', { name: 'Open door' }), {
    button: 0, clientX: 25, clientY: 25, pointerId: 43,
  });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 60, clientY: 25, pointerId: 43 });

  expect(onMoveToken).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'door-1' }),
    { x: 0.7, y: 0 },
  );

  onMoveToken.mockClear();
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Ogre' }), {
    button: 0, clientX: 225, clientY: 25, pointerId: 44,
  });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 260, clientY: 25, pointerId: 44 });

  // The switch is about scenery. A creature nudged by two thirds of a square
  // still lands on one.
  expect(onMoveToken).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'ogre-1' }),
    { x: 5, y: 0 },
  );
});

test('the marquee selects only movable pieces on the active layer and moves them as a group', () => {
  const onMoveTokens = vi.fn();
  const { container } = render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[
        { id: 'hero-1', label: 'Hero', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 },
        { id: 'ogre-1', label: 'Ogre', layer: 'tokens', x: 2, y: 1, w: 1, h: 1 },
        { id: 'enemy-1', label: 'Enemy', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 },
        { id: 'door-1', label: 'Door', iconKey: 'door-open', layer: 'map', x: 1, y: 1, w: 1, h: 1 },
      ]}
      snap
      canMove={(token) => token.id !== 'enemy-1'}
      fog={null}
      paintMode="marquee"
      activeLayer="tokens"
      onMoveTokens={onMoveTokens}
      onDeleteTokens={vi.fn()}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;

  fireEvent.pointerDown(viewport, { button: 0, clientX: 40, clientY: 40, pointerId: 60 });
  fireEvent.pointerMove(viewport, { button: 0, clientX: 160, clientY: 110, pointerId: 60 });
  expect(container.querySelector('[data-selection-marquee]')).not.toBeNull();
  fireEvent.pointerUp(viewport, { button: 0, clientX: 160, clientY: 110, pointerId: 60 });

  expect(container.querySelectorAll('[data-token-selected="true"]')).toHaveLength(2);
  expect(screen.getByText('2 selected')).toBeInTheDocument();

  fireEvent.pointerDown(screen.getByRole('button', { name: 'Hero' }), {
    button: 0, clientX: 75, clientY: 75, pointerId: 61,
  });
  fireEvent.pointerMove(viewport, { button: 0, clientX: 125, clientY: 75, pointerId: 61 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 125, clientY: 75, pointerId: 61 });

  expect(onMoveTokens).toHaveBeenCalledWith([
    { token: expect.objectContaining({ id: 'hero-1' }), position: { x: 2, y: 1 } },
    { token: expect.objectContaining({ id: 'ogre-1' }), position: { x: 3, y: 1 } },
  ]);
});

test('Delete removes the current marquee selection and Escape only clears it', async () => {
  const onDeleteTokens = vi.fn(() => true);
  const { rerender } = render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[{ id: 'hero-1', label: 'Hero', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 }]}
      snap
      canMove={() => true}
      fog={null}
      paintMode="marquee"
      activeLayer="tokens"
      onMoveTokens={vi.fn()}
      onDeleteTokens={onDeleteTokens}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const selectHero = (pointerId) => {
    fireEvent.pointerDown(viewport, { button: 0, clientX: 40, clientY: 40, pointerId });
    fireEvent.pointerMove(viewport, { button: 0, clientX: 110, clientY: 110, pointerId });
    fireEvent.pointerUp(viewport, { button: 0, clientX: 110, clientY: 110, pointerId });
  };

  selectHero(62);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onDeleteTokens).not.toHaveBeenCalled();
  expect(screen.queryByText('1 selected')).not.toBeInTheDocument();

  selectHero(63);
  fireEvent.keyDown(window, { key: 'Delete' });
  expect(onDeleteTokens).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
  expect(onDeleteTokens).toHaveBeenCalledWith([expect.objectContaining({ id: 'hero-1' })]);
  await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument());

  // Keep the component update path exercised: removed rows must not resurrect
  // a selection when realtime supplies the next token list.
  rerender(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => true}
      fog={null}
      paintMode="marquee"
      activeLayer="tokens"
      onMoveTokens={vi.fn()}
      onDeleteTokens={onDeleteTokens}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
});

function renderSelectionViewport(onDeleteTokens, extraProps = {}) {
  const props = {
    scene: { grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null },
    imageUrl: null,
    tokens: [{ id: 'hero-1', label: 'Hero', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 }],
    canMove: () => true,
    paintMode: 'marquee',
    activeLayer: 'tokens',
    onDeleteTokens,
    ...extraProps,
  };
  const result = render(<SceneViewport {...props} />);
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const select = () => {
    fireEvent.pointerDown(viewport, { button: 0, clientX: 40, clientY: 40 });
    fireEvent.pointerMove(viewport, { button: 0, clientX: 110, clientY: 110 });
    fireEvent.pointerUp(viewport, { button: 0, clientX: 110, clientY: 110 });
  };
  return { ...result, viewport, select, props };
}

test('selecting after editing a tool field transfers focus so the first Delete works', async () => {
  const user = userEvent.setup();
  const onDeleteTokens = vi.fn(() => true);
  const { viewport, select } = renderSelectionViewport(onDeleteTokens, {
    controls: <input data-viewport-control aria-label="Tool value" defaultValue="50" />,
  });
  await user.click(screen.getByRole('button', { name: 'Show the tools' }));
  await user.click(screen.getByRole('textbox', { name: 'Tool value' }));
  select();
  expect(viewport).toHaveFocus();
  await user.keyboard('{Delete}');
  const dialog = screen.getByRole('dialog', { name: 'Delete selected pieces?' });
  expect(onDeleteTokens).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
  expect(onDeleteTokens).toHaveBeenCalledOnce();
});

test('the Delete toolbar works on the first click and cancelling keeps the selection', async () => {
  const user = userEvent.setup();
  const onDeleteTokens = vi.fn();
  const { select, viewport } = renderSelectionViewport(onDeleteTokens);
  select();
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  const dialog = screen.getByRole('dialog');
  expect(viewport).toContainElement(dialog);
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('1 selected')).toBeInTheDocument();
  expect(onDeleteTokens).not.toHaveBeenCalled();
  await user.keyboard('{Backspace}');
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(screen.getByText('1 selected')).toBeInTheDocument();
  expect(onDeleteTokens).not.toHaveBeenCalled();
});

test('deletion stays visibly busy and repeated keys or clicks cannot submit it twice', async () => {
  const user = userEvent.setup();
  let finish;
  const onDeleteTokens = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
  const { select } = renderSelectionViewport(onDeleteTokens);
  select();
  await user.keyboard('{Delete}');
  const dialog = screen.getByRole('dialog');
  await user.dblClick(within(dialog).getByRole('button', { name: 'Delete' }));
  await user.keyboard('{Delete}{Backspace}{Escape}');
  expect(onDeleteTokens).toHaveBeenCalledOnce();
  expect(within(dialog).getByRole('button', { name: 'Deleting…' })).toBeDisabled();
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(dialog).toBeInTheDocument();
  await act(async () => finish(true));
  // The exit animation still paints this content after the operation settles.
  expect(dialog).toHaveTextContent('Remove Hero from the map?');
  expect(dialog).not.toHaveTextContent('Remove 0 selected pieces');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
});

test('a failed deletion can be retried without selecting the pieces again', async () => {
  const user = userEvent.setup();
  const onDeleteTokens = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue(true);
  const { select } = renderSelectionViewport(onDeleteTokens);
  select();
  await user.keyboard('{Delete}');
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
  expect(screen.getByText('1 selected')).toBeInTheDocument();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
  expect(onDeleteTokens).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('partial deletion leaves only the failed pieces selected for retry', async () => {
  const user = userEvent.setup();
  let finish;
  const onDeleteTokens = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
  const hero = { id: 'hero-1', label: 'Hero', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 };
  const ogre = { ...hero, id: 'ogre-1', label: 'Ogre' };
  const { select, rerender, props } = renderSelectionViewport(onDeleteTokens, { tokens: [hero, ogre] });
  select();
  await user.keyboard('{Delete}');
  expect(screen.getByText(/Remove 2 selected pieces/)).toBeInTheDocument();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
  rerender(<SceneViewport {...props} tokens={[ogre]} />);
  await act(async () => finish(false));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('1 selected')).toBeInTheDocument();
  await user.keyboard('{Backspace}');
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
  expect(onDeleteTokens).toHaveBeenLastCalledWith([ogre]);
  await act(async () => finish(true));
});

test('confirmation rechecks permission changes received while the panel is open', async () => {
  const user = userEvent.setup();
  const onDeleteTokens = vi.fn();
  const { select, props, rerender } = renderSelectionViewport(onDeleteTokens);
  select();
  await user.keyboard('{Delete}');
  rerender(<SceneViewport {...props} canMove={() => false} />);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
  expect(onDeleteTokens).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

const HEX_SCENE = {
  grid: {
    size: 50, offsetX: 0, offsetY: 0, visible: true, shape: 'hex',
  },
  playArea: null,
};

test('a piece dragged on a hex map lands on the hex under it', () => {
  const onMoveToken = vi.fn();
  render(
    <SceneViewport
      scene={HEX_SCENE}
      imageUrl={null}
      tokens={[{ id: 'party-1', label: 'Party', layer: 'tokens', x: 0, y: 0, w: 1, h: 1 }]}
      snap
      canMove={() => true}
      fog={null}
      onMoveToken={onMoveToken}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;

  // Grabbed at its centre and carried one hex to the right: on axial
  // coordinates that is q + 1, and the row is untouched.
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Party' }), {
    button: 0, clientX: 0, clientY: 0, pointerId: 50,
  });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 50, clientY: 0, pointerId: 50 });

  expect(onMoveToken).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'party-1' }),
    { x: 1, y: 0 },
  );
});

// The marker is the map everyone reads, so the viewport draws it from props
// alone — a player's window and the projector pass the same one the GM's does.
test('a hex map marks where the party stands', () => {
  const { container } = render(
    <SceneViewport
      scene={HEX_SCENE}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => false}
      fog={null}
      partyHex={{ q: 1, r: 0 }}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );

  expect(container.querySelector('[data-party-hex="1,0"]')).not.toBeNull();
});

test('the hexcrawl party marker is hidden with the battlemap overlays on a background', () => {
  const { container } = render(
    <SceneViewport
      scene={HEX_SCENE}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => false}
      fog={null}
      backgroundOnly
      partyHex={{ q: 1, r: 0 }}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );

  expect(container.querySelector('[data-party-hex]')).toBeNull();
});

test('the hex overlay paints a coloured cell under its outline', () => {
  const { container } = render(
    <HexGrid
      grid={HEX_SCENE.grid}
      view={{ x: 0, y: 0, zoom: 1 }}
      viewportSize={{ width: 400, height: 300 }}
      cells={new Map([['1:0', { q: 1, r: 0, status: 'travelled', color: '#6f8f5a' }]])}
    />,
  );

  // One path per colour, not one element per hex: a travelled country is
  // hundreds of hexes in the same green.
  const painted = container.querySelector('path[fill="#6f8f5a"]');
  expect(painted).not.toBeNull();
  expect(painted.getAttribute('d')).toMatch(/^M[-\d.,LM]+Z$/);
});

// The mesh is one repeating tile, so zooming out to the whole map costs the
// same as zooming in on one fight — and the grid is still there at the bottom
// of the range, which is where it used to give up.
test('the hex mesh survives being zoomed all the way out', () => {
  const { container } = render(
    <HexGrid
      grid={HEX_SCENE.grid}
      view={{ x: 0, y: 0, zoom: 0.15 }}
      viewportSize={{ width: 1200, height: 800 }}
      cells={new Map([['1:0', { q: 1, r: 0, status: 'travelled', color: '#6f8f5a' }]])}
    />,
  );

  const pattern = container.querySelector('pattern');
  expect(pattern).not.toBeNull();
  // The rect has to be able to name the pattern: React's own ids carry colons,
  // which a url(#…) reference cannot.
  expect(pattern.id).toMatch(/^[a-zA-Z0-9_-]+$/);
  expect(container.querySelector('rect').getAttribute('fill')).toBe(`url(#${pattern.id})`);
  // One hex width across, two rows down: the period of the lattice.
  expect(Number(pattern.getAttribute('width'))).toBeCloseTo(50 * 0.15, 5);
  expect(container.querySelector('path[fill="#6f8f5a"]')).not.toBeNull();
});

test('clicking the board of a hex map picks a hex, dragging it still pans', () => {
  const onHexClick = vi.fn();
  render(
    <SceneViewport
      scene={HEX_SCENE}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => false}
      fog={null}
      onHexClick={onHexClick}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;

  fireEvent.pointerDown(viewport, { button: 0, clientX: 50, clientY: 0, pointerId: 51 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 50, clientY: 0, pointerId: 51 });
  expect(onHexClick).toHaveBeenCalledWith({ q: 1, r: 0 });

  // A pan is a drag, and a drag is not a pick.
  onHexClick.mockClear();
  fireEvent.pointerDown(viewport, { button: 0, clientX: 50, clientY: 0, pointerId: 52 });
  fireEvent.pointerMove(viewport, { clientX: 160, clientY: 90, pointerId: 52 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 160, clientY: 90, pointerId: 52 });
  expect(onHexClick).not.toHaveBeenCalled();
});

test('a hex outside the play area cannot be selected or rolled', () => {
  const onHexClick = vi.fn();
  render(
    <SceneViewport
      scene={{ ...HEX_SCENE, playArea: { x: 1, y: 1, w: 2, h: 2 } }}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => false}
      fog={null}
      onHexClick={onHexClick}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;

  // The axial play area begins at q=1,r=1. The infinite hex lattice still has a
  // cell at 25,25, but that staging-space cell must not trigger a crawl.
  fireEvent.pointerDown(viewport, { button: 0, clientX: 25, clientY: 25, pointerId: 53 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 25, clientY: 25, pointerId: 53 });
  expect(onHexClick).not.toHaveBeenCalled();

  // Centre of axial hex q=1,r=1 on a 50 px pointy-top grid.
  fireEvent.pointerDown(viewport, { button: 0, clientX: 75, clientY: 43.3, pointerId: 54 });
  fireEvent.pointerUp(viewport, { button: 0, clientX: 75, clientY: 43.3, pointerId: 54 });
  expect(onHexClick).toHaveBeenCalledOnce();
});

test('a fitted hex area cuts edge hexes at the exact image boundary', async () => {
  const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 300,
    height: 300,
    left: 0,
    right: 400,
    top: 0,
    width: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

  try {
    const { container } = render(
      <SceneViewport
        scene={{ ...HEX_SCENE, playArea: { x: -1, y: 0, w: 5, h: 3 } }}
        imageUrl="map.webp"
        preparedImageSize={{ width: 200, height: 100 }}
        tokens={[]}
        snap
        canMove={() => false}
        fog={null}
        showPlayArea
        drawings={[]}
        lasers={[]}
        rollBubbles={[]}
        diceThrows={[]}
      />,
    );

    await waitFor(() => {
      const gridClip = container.querySelector('clipPath rect');
      expect(gridClip).toHaveAttribute('x', '24');
      expect(gridClip).toHaveAttribute('y', '62');
      expect(gridClip).toHaveAttribute('width', '352');
      expect(gridClip).toHaveAttribute('height', '176');
    });

    const guide = container.querySelector('[data-play-area="hex-map"] rect');
    expect(guide).not.toBeNull();
    expect(container.querySelector('[data-play-area="hex-map"] polygon')).toBeNull();
  } finally {
    rectSpy.mockRestore();
  }
});

test('a selected ruler starts on top of a token instead of dragging it', () => {
  const onMeasure = vi.fn();
  const onMoveToken = vi.fn();
  render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[{ id: 'ogre-1', label: 'Ogre', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 }]}
      snap
      canMove={() => true}
      fog={null}
      paintMode="measure"
      measureShape="line"
      feetPerCellForRuler={5}
      onMeasure={onMeasure}
      onMoveToken={onMoveToken}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const token = screen.getByRole('button', { name: 'Ogre' });
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;

  fireEvent.pointerDown(token, { button: 0, clientX: 60, clientY: 60, pointerId: 12 });
  fireEvent.pointerMove(viewport, { clientX: 120, clientY: 60, pointerId: 12 });

  expect(token).toHaveStyle({ pointerEvents: 'none' });
  expect(onMeasure).toHaveBeenCalledWith(expect.objectContaining({
    shape: 'line',
    from: expect.any(Object),
    to: expect.any(Object),
  }));
  expect(onMoveToken).not.toHaveBeenCalled();
});

test('a held map tool prevents the browser from selecting page text', () => {
  render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[]}
      snap
      canMove={() => true}
      fog={null}
      paintMode="measure"
      measureShape="line"
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
    />,
  );
  const viewport = screen.getByText('Upload a map image to start building this scene.').parentElement;
  const selection = globalThis.getSelection();
  const range = document.createRange();
  range.selectNodeContents(viewport);
  selection.addRange(range);
  const pointerDown = new Event('pointerdown', { bubbles: true, cancelable: true });
  Object.defineProperties(pointerDown, {
    button: { value: 0 },
    clientX: { value: 60 },
    clientY: { value: 60 },
    pointerId: { value: 18 },
  });

  fireEvent(viewport, pointerDown);

  expect(pointerDown.defaultPrevented).toBe(true);
  expect(selection.rangeCount).toBe(0);
});

test('a spectator viewport leaves its pieces inert but keeps the fullscreen control', () => {
  const onMoveToken = vi.fn();
  render(
    <SceneViewport
      scene={{ grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null }}
      imageUrl={null}
      tokens={[{ id: 'hero-1', label: 'Hero', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 }]}
      snap
      canMove={() => true}
      fog={null}
      paintMode="select"
      onMoveToken={onMoveToken}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
      cameraLocked
    />,
  );

  const token = screen.getByRole('button', { name: 'Hero' });
  fireEvent.pointerDown(token, { button: 0, clientX: 60, clientY: 60, pointerId: 30 });

  expect(token).toHaveStyle({ pointerEvents: 'none' });
  expect(screen.getByRole('button', { name: 'Fullscreen map' })).toBeTruthy();
  expect(onMoveToken).not.toHaveBeenCalled();
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

test('an iPad identifying as a Mac uses stable window coverage even with native fullscreen available', () => {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
  const { viewport } = renderLaserViewport(vi.fn());
  const request = vi.fn();
  viewport.requestFullscreen = request;
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen map' }));
    expect(request).not.toHaveBeenCalled();
    expect(viewport).toHaveStyle({ position: 'fixed' });
    fireEvent.pointerDown(viewport, { button: 0, clientX: 60, clientY: 60 });
    fireEvent.pointerMove(viewport, { clientX: 100, clientY: 120 });
    fireEvent.pointerUp(viewport, { clientX: 100, clientY: 120 });
    expect(screen.getByRole('button', { name: 'Leave fullscreen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave fullscreen' }));
    expect(viewport).toHaveStyle({ position: 'relative' });
  } finally {
    delete navigator.maxTouchPoints;
  }
});

test('a rejected fullscreen request falls back to window coverage and can exit', async () => {
  const { viewport } = renderLaserViewport(vi.fn());
  viewport.requestFullscreen = vi.fn().mockRejectedValue(new Error('Fullscreen denied'));
  fireEvent.click(screen.getByRole('button', { name: 'Fullscreen map' }));
  await screen.findByRole('button', { name: 'Leave fullscreen' });
  expect(viewport).toHaveStyle({ position: 'fixed' });
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Fullscreen map' })).toBeInTheDocument();
});

test('a replacement picture is framed from its prepared dimensions before paint', () => {
  const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 600,
    height: 600,
    left: 0,
    right: 800,
    top: 0,
    width: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  const scene = {
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: false },
    playArea: null,
  };
  const renderViewport = ({ backgroundOnly, imageUrl, preparedImageSize }) => (
    <SceneViewport
      scene={scene}
      imageUrl={imageUrl}
      preparedImageSize={preparedImageSize}
      tokens={[]}
      snap
      canMove={() => false}
      fog={null}
      drawings={[]}
      lasers={[]}
      rollBubbles={[]}
      diceThrows={[]}
      backgroundOnly={backgroundOnly}
    />
  );

  try {
    const { container, rerender } = render(renderViewport({
      backgroundOnly: false,
      imageUrl: 'map.webp',
      preparedImageSize: { width: 1600, height: 800 },
    }));
    expect(container.querySelector('img')).toHaveStyle({
      transform: 'translate(24px, 112px) scale(0.47)',
    });

    rerender(renderViewport({
      backgroundOnly: true,
      imageUrl: 'background.webp',
      preparedImageSize: { width: 800, height: 1200 },
    }));
    expect(container.querySelector('img')).toHaveStyle({
      transform: 'translate(0px, -300px) scale(1)',
    });
  } finally {
    rectSpy.mockRestore();
  }
});
