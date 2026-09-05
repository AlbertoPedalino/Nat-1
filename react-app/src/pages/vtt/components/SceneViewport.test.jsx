import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, vi } from 'vitest';
import SceneViewport from './SceneViewport.jsx';
import { PIECE_POINTER_DRAG_EVENT } from './PiecePreview.jsx';
import HexGrid from './HexGrid.jsx';
import SquareGrid from './SquareGrid.jsx';

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
