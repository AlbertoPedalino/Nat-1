import { render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import LaserOverlay from './LaserOverlay.jsx';

const grid = { size: 50, offsetX: 0, offsetY: 0 };
const view = { x: 0, y: 0, zoom: 1 };

test('a remote laser interpolates instead of jumping to a new network position', async () => {
  const localPointRef = createRef();
  const { container, rerender } = render(
    <LaserOverlay
      lasers={[{ id: 'player-1', x: 1, y: 1, label: 'Player' }]}
      localPointRef={localPointRef}
      localActive={false}
      grid={grid}
      view={view}
    />,
  );
  const dot = container.querySelector('[data-remote-laser="true"]');
  const firstTransform = dot.style.transform;

  rerender(
    <LaserOverlay
      lasers={[{ id: 'player-1', x: 3, y: 1, label: 'Player' }]}
      localPointRef={localPointRef}
      localActive={false}
      grid={grid}
      view={view}
    />,
  );

  expect(dot.style.transform).toBe(firstTransform);
  await waitFor(() => expect(dot.style.transform).not.toBe(firstTransform));
});
