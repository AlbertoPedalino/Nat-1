import { fireEvent, render as baseRender, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../theme.js';
import HexcrawlPanel from './HexcrawlPanel.jsx';
import HexResultDialog from './HexResultDialog.jsx';
import HexBubble from './HexBubble.jsx';
import { createDefaultCoreState } from '../../gmboard/logic/defaultState.js';
import { createDefaultTables } from '../../gmboard/logic/defaultTables.js';

// The step rows read their tones from the app palette, so both components are
// rendered under the real theme rather than MUI's default one.
const render = (ui) => {
  const result = baseRender(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
  return {
    ...result,
    rerender: (next) => result.rerender(<ThemeProvider theme={theme}>{next}</ThemeProvider>),
  };
};

const BOARD = {
  id: 'board-1',
  name: 'Wilderness',
  state: { ...createDefaultCoreState(), season: 'Summer' },
  tables: createDefaultTables(),
};
const CLOCK = {
  min: 480, day: 1, month: 1, year: 1000, meteo: 'Rain', intensity: 'Heavy', season: 'Summer',
};
const DEFAULTS = { terrain: 'Plains', pop: 'unexplored', tier: 1 };

function noop() {}

const panel = (overrides = {}) => (
  <HexcrawlPanel
    board={BOARD}
    clock={CLOCK}
    clockLinked
    defaults={DEFAULTS}
    armed
    onDefaultsChange={noop}
    onSeasonChange={noop}
    onArmedChange={noop}
    {...overrides}
  />
);

test('the panel shows the campaign clock and its weather before anything is picked', () => {
  render(panel());
  expect(screen.getByText(/rain · heavy/i)).toBeInTheDocument();
  expect(screen.getByText(/click a hex to walk the party into it/i)).toBeInTheDocument();
  // Heavy rain costs the party advantage, and the panel says so rather than
  // leaving the GM to remember the table.
  expect(screen.getByText(/disadvantage/i)).toBeInTheDocument();
});

test('the season is set once, on the campaign rather than on the hex', () => {
  const onSeasonChange = vi.fn();
  render(panel({ onSeasonChange }));
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Season' }));
  fireEvent.click(within(screen.getByRole('listbox')).getByText('Autumn'));
  expect(onSeasonChange).toHaveBeenCalledWith('Autumn');
});

test('the defaults are what an untouched hex is assumed to be', () => {
  const onDefaultsChange = vi.fn();
  render(panel({ onDefaultsChange }));
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Terrain' }));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(/^Mountain/));
  expect(onDefaultsChange).toHaveBeenCalledWith({ terrain: 'Mountain' });
});

test('arming can be turned off so laying out a map costs the party no time', () => {
  const onArmedChange = vi.fn();
  render(panel({ onArmedChange }));
  fireEvent.click(screen.getByRole('switch', { name: /clicking a hex enters it and rolls/i }));
  expect(onArmedChange).toHaveBeenCalledWith(false);
});

// The panel is setup only: no per-hex form to fill in before every click, which
// is the tedium the click-to-enter flow exists to remove.
test('an incomplete setup is said up front rather than refused after the click', () => {
  render(panel({ defaults: { terrain: 'Plains', pop: null, tier: null } }));
  expect(screen.getByText(/set population, tier before walking into a hex/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Enter hex' })).toBeNull();
  expect(screen.queryByLabelText(/this hex/i)).toBeNull();
});

test('without a linked board the panel points at the GM Board', () => {
  render(panel({ board: null }));
  expect(screen.getByText(/no hexcrawl board is linked/i)).toBeInTheDocument();
});

test('the result dialog reports the hex, the time, the weather and the rolls', () => {
  const onClose = vi.fn();
  render(
    <HexResultDialog
      result={{
        steps: [{ kind: 'none' }],
        hex: { q: 2, r: -1, terrain: 'Forest' },
        clock: {
          min: 720, day: 2, month: 1, year: 1000, meteo: 'Snow', intensity: 'Heavy',
        },
      }}
      onClose={onClose}
    />,
  );

  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/hex 2, -1 · forest \(4h\)/i)).toBeInTheDocument();
  // The weather is a badge in the corner of the title: it is the condition every
  // roll below was made under, not a line among them.
  expect(within(dialog).getByText(/snow · heavy · disadvantage/i)).toBeInTheDocument();
  expect(within(dialog).getByText(/no event this leg/i)).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalled();
});

test('the bubble answers over the hex, and opens the rolls when clicked', () => {
  const onOpen = vi.fn();
  render(
    <HexBubble
      bubble={{
        hex: { q: 4, r: 2 }, headline: 'Wandering Monster', lines: ['d6 1 vs 2', 'Encounter: Hard'],
      }}
      x={120}
      y={80}
      onOpen={onOpen}
    />,
  );

  expect(screen.getByText('Hex 4, 2')).toBeInTheDocument();
  expect(screen.getByText('Wandering Monster')).toBeInTheDocument();
  expect(screen.getByText('Encounter: Hard')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /wandering monster — see every roll/i }));
  expect(onOpen).toHaveBeenCalled();
});

test('no result means no dialog on the map', () => {
  render(<HexResultDialog result={null} onClose={noop} />);
  expect(screen.queryByRole('dialog')).toBeNull();
});
