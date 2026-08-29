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

  expect(screen.getByRole('slider', { name: 'Atmosphere intensity' })).toHaveValue('0.7');
  fireEvent.change(screen.getByLabelText('Direction'), { target: { value: '45' } });

  expect(onAtmosphereChange).toHaveBeenCalledWith({
    type: 'rain', intensity: 0.7, direction: 45, speed: 1, seed: 42,
  });
});
