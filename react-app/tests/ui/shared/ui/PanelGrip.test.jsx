import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { buildTheme } from '../../../../src/app/theme.js';
import Panel from '../../../../src/shared/ui/Panel.jsx';

// jsdom lays nothing out: every box is given a size, as a page would (over
// Element's own, put back after).
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 360 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 200 });
});
afterAll(() => ['clientWidth', 'clientHeight'].forEach((key) => delete HTMLElement.prototype[key]));

const panelIn = (styleId) => render(
  <ThemeProvider theme={buildTheme({ styleId })}>
    <Panel title="Saving Throws">rows</Panel>
  </ThemeProvider>,
);

// The abyssal style grips every panel with its tentacle, cut to the panel's
// size, over its banner; the comic grips none, its banner alone under the bar.
const drawings = (container) => [...container.querySelectorAll('svg[aria-hidden="true"]')].filter((svg) => svg.style.display !== 'none');
test('a panel is gripped only where its style grips panels, and bannered as its style draws its bars', () => {
  const abyssal = drawings(panelIn('abyssal').container);
  const grip = abyssal.find((svg) => svg.style.zIndex === '1');
  const banner = abyssal.find((svg) => svg.style.zIndex === '-1');
  expect(grip.style.pointerEvents).toBe('none');
  expect(grip.querySelectorAll('path').length).toBeGreaterThan(20);
  expect(banner.querySelectorAll('path').length).toBeGreaterThan(5);
  const comic = drawings(panelIn('comic').container);
  expect(comic.map((svg) => svg.style.zIndex)).toEqual(['-1']);
});
