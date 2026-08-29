import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { DEFAULT_GRID } from '../../../shared/vtt/scene.js';
import { MapPanel } from './ScenePanels.jsx';

test('atmosphere controls update the scene as one description', () => {
  const onAtmosphereChange = vi.fn();
  render(
    <MapPanel
      scene={{
        imagePath: null,
        backgroundPath: null,
        shownImage: 'map',
        grid: DEFAULT_GRID,
        playArea: null,
        atmosphere: { type: 'rain', intensity: 0.7, direction: 12, speed: 1, seed: 42 },
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

  expect(screen.queryByRole('slider', { name: 'Atmosphere intensity' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Choose atmosphere. Current: Rain' }));
  expect(screen.getByRole('slider', { name: 'Atmosphere intensity' })).toHaveValue('0.7');
  fireEvent.change(screen.getByLabelText('Direction'), { target: { value: '45' } });

  expect(onAtmosphereChange).toHaveBeenCalledWith({
    type: 'rain', intensity: 0.7, direction: 45, speed: 1, seed: 42,
  });
});

test('the atmosphere picker filters presets and selects one immediately', () => {
  vi.spyOn(Date, 'now').mockReturnValue(123456);
  const onAtmosphereChange = vi.fn();
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
      onAtmosphereChange={onAtmosphereChange}
      onPlayAreaChange={vi.fn()}
      onFitPlayArea={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Choose atmosphere. Current: None' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search atmospheres' }), {
    target: { value: 'gold' },
  });
  expect(screen.queryByRole('button', { name: 'Rain' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gold vault' }));

  expect(onAtmosphereChange).toHaveBeenCalledWith({
    type: 'goldvault', intensity: 0.65, direction: 12, speed: 1, seed: 123457,
  });
});
