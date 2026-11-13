import { fireEvent, render, screen } from '@testing-library/react';
import { iconNames } from 'lucide-react/dynamic';
import { vi } from 'vitest';
import MapObjectsPanel from '../../../../../src/pages/vtt/objects/MapObjectsPanel.jsx';

// The game drawings' generated files (scripts/build-game-icons.mjs), served.
const DRAWING_NAMES = ['chest', 'treasure-map'];
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url) => ({
    ok: true,
    json: async () => (String(url).endsWith('/index.json')
      ? { version: 'test', names: DRAWING_NAMES }
      : { viewBox: '0 0 512 512', paths: ['M0 0h512v512z'] }),
  })));
});
afterEach(() => vi.unstubAllGlobals());

test('the objects panel searches and paginates the game drawings and the complete Lucide catalog', async () => {
  const onPlace = vi.fn();
  render(<MapObjectsPanel layer="gm" onPlace={onPlace} />);

  expect(await screen.findByText(new RegExp(`^${DRAWING_NAMES.length + new Set(iconNames).size} icons`))).toBeInTheDocument();
  // The drawings come first, each fetched as it is shown.
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/game-icons\/chest\.json$/));
  expect(screen.getByRole('navigation')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search icons' }), {
    target: { value: 'zodiac virgo' },
  });
  const colorInput = screen.getByLabelText('Object color');
  fireEvent.input(colorInput, { target: { value: '#ff3355' } });
  // The picker closes (focus leaves the well) before a button is pressed.
  fireEvent.blur(colorInput);
  fireEvent.change(screen.getByRole('slider', { name: 'Icon stroke width' }), {
    target: { value: '3.2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Place Zodiac Virgo' }));

  expect(onPlace).toHaveBeenCalledWith(expect.objectContaining({
    key: 'zodiac-virgo',
    label: 'Zodiac Virgo',
    color: '#ff3355',
    strokeWidth: 3.2,
    layer: 'gm',
  }));
});

test("a game drawing is placed under its game: key", async () => {
  const onPlace = vi.fn();
  render(<MapObjectsPanel layer="tokens" onPlace={onPlace} />);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search icons' }), { target: { value: 'treasure map' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Place Treasure Map' }));
  expect(onPlace).toHaveBeenCalledWith(expect.objectContaining({ key: 'game:treasure-map', label: 'Treasure Map' }));
});

test('an object starts pointer placement with a mouse', () => {
  const onPlacementDragStart = vi.fn();
  const onPlacementDragEnd = vi.fn();
  render(
    <MapObjectsPanel
      layer="gm"
      onPlace={vi.fn()}
      onPlacementDragStart={onPlacementDragStart}
      onPlacementDragEnd={onPlacementDragEnd}
    />,
  );

  const source = screen.getAllByRole('button', { name: /^Place / })[0];
  const pointer = (type, clientX) => {
    const event = new MouseEvent(type, {
      bubbles: true, cancelable: true, button: 0, clientX, clientY: 80,
    });
    Object.defineProperties(event, {
      isPrimary: { value: true },
      pointerId: { value: 4 },
      pointerType: { value: 'mouse' },
    });
    return event;
  };

  fireEvent(source, pointer('pointerdown', 260));
  fireEvent(window, pointer('pointermove', 220));
  expect(onPlacementDragStart).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'object',
    object: expect.objectContaining({ layer: 'gm' }),
  }));
  fireEvent(window, pointer('pointerup', 180));
  expect(onPlacementDragEnd).toHaveBeenCalledOnce();
});
