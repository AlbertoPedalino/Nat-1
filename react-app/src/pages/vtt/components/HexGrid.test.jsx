import { render } from '@testing-library/react';
import HexGrid from './HexGrid.jsx';

const grid = { size: 50, offsetX: 0, offsetY: 0, shape: 'hex' };
const view = { x: 0, y: 0, zoom: 1 };

test('the hex overlay is clipped to the play area', () => {
  const { container } = render(
    <HexGrid
      grid={grid}
      view={view}
      viewportSize={{ width: 500, height: 300 }}
      clipRect={{ left: 50, top: 25, width: 200, height: 150 }}
    />,
  );

  const clip = container.querySelector('clipPath');
  const clippedGroup = container.querySelector('g[clip-path]');
  expect(clip.querySelector('rect')).toHaveAttribute('x', '50');
  expect(clip.querySelector('rect')).toHaveAttribute('y', '25');
  expect(clip.querySelector('rect')).toHaveAttribute('width', '200');
  expect(clip.querySelector('rect')).toHaveAttribute('height', '150');
  expect(clippedGroup.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
});

test('without a play area the hex overlay still covers the viewport', () => {
  const { container } = render(
    <HexGrid grid={grid} view={view} viewportSize={{ width: 500, height: 300 }} />,
  );

  expect(container.querySelector('clipPath')).toBeNull();
  expect(container.querySelector('g[clip-path]')).toBeNull();
});
