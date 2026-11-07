import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { DEFAULT_GRID } from '../../../../../src/shared/vtt/scene/scene.js';
import { FogPanel } from '../../../../../src/pages/vtt/scene/ScenePanels.jsx';
import { DrawPanel } from '../../../../../src/pages/vtt/scene/DrawPanel.jsx';
import { MapPanel } from '../../../../../src/pages/vtt/scene/MapPanel.jsx';
import { DEFAULT_AREA_OPTIONS } from '../../../../../src/shared/vtt/map/areas.js';

// The scene panel remembers its open sections per browser; every test starts
// from the default (only Pictures open).
beforeEach(() => window.localStorage.clear());

const openSection = (name) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));

test('the fog brush accepts a half-cell diameter as a valid number', () => {
  const onBrushSizeChange = vi.fn();
  const { rerender } = render(<FogPanel scene={{ fog: { scale: 4 } }} brushSize={1} onBrushSizeChange={onBrushSizeChange} />);
  const input = screen.getByRole('spinbutton', { name: 'Brush (cells)' });
  fireEvent.change(input, { target: { value: '0.5' } });
  expect(onBrushSizeChange).toHaveBeenCalledWith(0.5);
  rerender(<FogPanel scene={{ fog: { scale: 4 } }} brushSize={0.5} onBrushSizeChange={onBrushSizeChange} />);
  expect(input.validity.stepMismatch).toBe(false);
  expect(input.validity.rangeUnderflow).toBe(false);
});

test('atmosphere controls update the scene as one description', () => {
  const onAtmosphereChange = vi.fn();
  render(
    <MapPanel
      scene={{
        imagePath: 'map.png',
        backgroundPath: null,
        shownImage: 'map',
        grid: DEFAULT_GRID,
        playArea: null,
        atmospheres: { 'map.png': { type: 'rain', intensity: 0.7, direction: 12, speed: 1, seed: 42 } },
      }}
      busy={false}
      onUploadMap={vi.fn()}
      onUploadBackground={vi.fn()}
      onShownImageChange={vi.fn()}
      onAddImage={vi.fn()}
      onGridChange={vi.fn()}
      onAtmosphereChange={onAtmosphereChange}
      onPlayAreaChange={vi.fn()}
      onFitPlayArea={vi.fn()}
    />,
  );

  openSection('Light & weather');
  // The strength sits under the picker, like the light filter's.
  expect(screen.getByRole('slider', { name: 'Atmosphere intensity' })).toHaveValue('0.7');
  fireEvent.change(screen.getByLabelText('Direction'), { target: { value: '45' } });

  expect(onAtmosphereChange).toHaveBeenCalledWith('map.png', {
    type: 'rain', intensity: 0.7, direction: 45, speed: 1, seed: 42,
  });
});

test('the atmosphere picker filters presets and selects one immediately', () => {
  vi.spyOn(Date, 'now').mockReturnValue(123456);
  const onAtmosphereChange = vi.fn();
  render(
    <MapPanel
      scene={{
        imagePath: 'map.png',
        backgroundPath: null,
        shownImage: 'map',
        grid: DEFAULT_GRID,
        playArea: null,
        atmospheres: {},
      }}
      busy={false}
      onUploadMap={vi.fn()}
      onUploadBackground={vi.fn()}
      onShownImageChange={vi.fn()}
      onAddImage={vi.fn()}
      onGridChange={vi.fn()}
      onAtmosphereChange={onAtmosphereChange}
      onPlayAreaChange={vi.fn()}
      onFitPlayArea={vi.fn()}
    />,
  );

  openSection('Light & weather');
  fireEvent.click(screen.getByRole('button', { name: 'Choose atmosphere. Current: None' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search atmospheres' }), {
    target: { value: 'gold' },
  });
  expect(screen.queryByRole('button', { name: 'Rain' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gold vault' }));

  expect(onAtmosphereChange).toHaveBeenCalledWith('map.png', {
    type: 'goldvault', intensity: 0.65, direction: 12, speed: 1, seed: 123457,
  });
});

test('uploaded scene pictures expose their matching remove actions', () => {
  const onRemoveMap = vi.fn();
  const onRemoveBackground = vi.fn();
  render(
    <MapPanel
      scene={{
        imagePath: 'c1/s1/map.webp',
        backgroundPath: 'c1/s1/background.webp',
        shownImage: 'map',
        grid: DEFAULT_GRID,
        playArea: null,
        atmospheres: {},
      }}
      busy={false}
      onUploadMap={vi.fn()}
      onUploadBackground={vi.fn()}
      onRemoveMap={onRemoveMap}
      onRemoveBackground={onRemoveBackground}
      onShownImageChange={vi.fn()}
      onAddImage={vi.fn()}
      onGridChange={vi.fn()}
      onAtmosphereChange={vi.fn()}
      onPlayAreaChange={vi.fn()}
      onFitPlayArea={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Remove battlemap' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove background' }));

  expect(onRemoveMap).toHaveBeenCalledOnce();
  expect(onRemoveBackground).toHaveBeenCalledOnce();
});

test('the area tool offers shape, fill, the feet per square step, effect and label', () => {
  const onAreaOptionsChange = vi.fn();
  const onPaintModeChange = vi.fn();
  const onFeetPerCellChange = vi.fn();
  const props = {
    busy: false,
    drawColor: '#e8c96a',
    drawWidth: 3,
    canUndo: false,
    feetPerCell: 5,
    onPaintModeChange,
    onDrawColorChange: vi.fn(),
    onDrawWidthChange: vi.fn(),
    onUndoDrawing: vi.fn(),
    onAreaOptionsChange,
    onFeetPerCellChange,
  };
  const { rerender } = render(<DrawPanel {...props} paintMode="draw" areaOptions={DEFAULT_AREA_OPTIONS} />);
  // Only the area tool shows its options.
  expect(screen.queryByRole('spinbutton', { name: 'Feet per square' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Area' }));
  expect(onPaintModeChange).toHaveBeenCalledWith('area');

  rerender(<DrawPanel {...props} paintMode="area" areaOptions={DEFAULT_AREA_OPTIONS} />);
  // No size up front: it is dragged out on the map, in steps of this.
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Feet per square' }), { target: { value: '10' } });
  expect(onFeetPerCellChange).toHaveBeenLastCalledWith(10);
  fireEvent.click(screen.getByRole('button', { name: 'Outline only' }));
  expect(onAreaOptionsChange).toHaveBeenLastCalledWith({ filled: false });
  fireEvent.change(screen.getByRole('textbox', { name: 'Label' }), { target: { value: 'Fireball' } });
  expect(onAreaOptionsChange).toHaveBeenLastCalledWith({ label: 'Fireball' });
  fireEvent.click(screen.getByRole('button', { name: 'Line' }));
  expect(onAreaOptionsChange).toHaveBeenLastCalledWith({ shape: 'line' });

  // A line also asks how wide it is; an effect fills the area by itself.
  rerender(
    <DrawPanel
      {...props}
      paintMode="area"
      areaOptions={{ ...DEFAULT_AREA_OPTIONS, shape: 'line', effect: 'fire' }}
    />,
  );
  expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
  expect(screen.getByRole('spinbutton', { name: 'Width (ft)' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Outline only' })).toBeDisabled();
});

test('the light filter belongs to the picture on show', () => {
  const onImageFilterChange = vi.fn();
  render(
    <MapPanel
      scene={{
        imagePath: 'map.png',
        backgroundPath: 'bg.png',
        backgrounds: ['bg.png'],
        shownImage: 'background',
        imageFilters: { 'map.png': { type: 'night', intensity: 1 } },
        grid: DEFAULT_GRID,
        playArea: null,
        atmosphere: { type: 'none', intensity: 0.65, direction: 12, speed: 1, seed: 1 },
      }}
      busy={false}
      onUploadMap={vi.fn()}
      onUploadBackground={vi.fn()}
      onShownImageChange={vi.fn()}
      onAddImage={vi.fn()}
      onGridChange={vi.fn()}
      onAtmosphereChange={vi.fn()}
      onImageFilterChange={onImageFilterChange}
      onPlayAreaChange={vi.fn()}
      onFitPlayArea={vi.fn()}
    />,
  );

  // Closed, the section still says what the picture on show looks like.
  expect(screen.getByRole('button', { name: /^Light & weather/ })).toHaveTextContent('Original light · no atmosphere');
  openSection('Light & weather');
  // The battlemap's night does not carry over to the background.
  expect(screen.getByText('Light on this background')).toBeInTheDocument();
  expect(screen.queryByRole('slider', { name: 'Light filter strength' })).toBeNull();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Light filter' }));
  fireEvent.click(screen.getByRole('option', { name: 'Sunset' }));

  expect(onImageFilterChange).toHaveBeenCalledWith('bg.png', { type: 'sunset', intensity: 1 });
});

test('no light filter is offered before a picture is uploaded', () => {
  render(
    <MapPanel
      scene={{
        imagePath: null,
        backgroundPath: null,
        shownImage: 'map',
        grid: DEFAULT_GRID,
        playArea: null,
        atmosphere: { type: 'none', intensity: 0.65, direction: 12, speed: 1, seed: 1 },
      }}
      busy={false}
      onUploadMap={vi.fn()}
      onUploadBackground={vi.fn()}
      onShownImageChange={vi.fn()}
      onAddImage={vi.fn()}
      onGridChange={vi.fn()}
      onAtmosphereChange={vi.fn()}
      onImageFilterChange={vi.fn()}
      onPlayAreaChange={vi.fn()}
      onFitPlayArea={vi.fn()}
    />,
  );

  expect(screen.getByRole('button', { name: /^Light & weather/ })).toHaveTextContent('No picture on show');
  openSection('Light & weather');
  expect(screen.queryByRole('combobox', { name: 'Light filter' })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Choose atmosphere/ })).toBeNull();
});

test('the atmosphere belongs to the picture on show, like its light', () => {
  const onAtmosphereChange = vi.fn();
  render(
    <MapPanel
      scene={{
        imagePath: 'map.png',
        backgroundPath: 'bg.png',
        backgrounds: ['bg.png'],
        shownImage: 'background',
        atmospheres: { 'map.png': { type: 'storm', intensity: 0.9 } },
        grid: DEFAULT_GRID,
        playArea: null,
      }}
      busy={false}
      onUploadMap={vi.fn()}
      onUploadBackground={vi.fn()}
      onShownImageChange={vi.fn()}
      onAddImage={vi.fn()}
      onGridChange={vi.fn()}
      onAtmosphereChange={onAtmosphereChange}
      onImageFilterChange={vi.fn()}
      onPlayAreaChange={vi.fn()}
      onFitPlayArea={vi.fn()}
    />,
  );

  // The battlemap's storm does not rain on the background.
  expect(screen.getByRole('button', { name: /^Light & weather/ })).toHaveTextContent('Original light · no atmosphere');
  openSection('Light & weather');
  expect(screen.getByText('Atmosphere on this background')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Choose atmosphere. Current: None' }));
  fireEvent.click(screen.getByRole('button', { name: 'Snowfall' }));
  expect(onAtmosphereChange).toHaveBeenCalledWith('bg.png', expect.objectContaining({ type: 'snow' }));
});

test('scene settings are grouped in sections that summarise themselves and remember being open', () => {
  const props = {
    scene: {
      imagePath: 'map.png',
      backgroundPath: null,
      backgrounds: [],
      shownImage: 'map',
      grid: { ...DEFAULT_GRID, shape: 'hex', size: 80, visible: false },
      playArea: { x: 0, y: 0, w: 30, h: 20 },
      atmospheres: { 'map.png': { type: 'rain', intensity: 0.7, direction: 12, speed: 1, seed: 42 } },
    },
    busy: false,
    onUploadMap: vi.fn(),
    onUploadBackground: vi.fn(),
    onShownImageChange: vi.fn(),
    onAddImage: vi.fn(),
    onGridChange: vi.fn(),
    onAtmosphereChange: vi.fn(),
    onPlayAreaChange: vi.fn(),
    onFitPlayArea: vi.fn(),
  };
  const { unmount } = render(<MapPanel {...props} />);

  // Pictures starts open; the others answer in their header.
  expect(screen.getByRole('button', { name: /^Pictures/ })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: /^Grid/ })).toHaveTextContent('Hexes · 80 px · hidden');
  expect(screen.getByRole('button', { name: /^Play area/ })).toHaveTextContent('30 × 20 hexes');
  expect(screen.getByRole('button', { name: /^Light & weather/ })).toHaveTextContent('Original light · Rain');
  expect(screen.queryByRole('spinbutton', { name: 'Cell' })).toBeNull();

  openSection('Grid');
  expect(screen.getByRole('spinbutton', { name: 'Cell' })).toHaveValue(80);
  openSection('Pictures');
  expect(screen.getByRole('button', { name: /^Pictures/ })).toHaveAttribute('aria-expanded', 'false');

  // Reopening the panel keeps the same sections open.
  unmount();
  render(<MapPanel {...props} />);
  expect(screen.getByRole('button', { name: /^Grid/ })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: /^Pictures/ })).toHaveAttribute('aria-expanded', 'false');
});
