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

// The tier keeps the GM Board's colours and its one-click row rather than
// hiding behind a fifth dropdown.
test('the tier is picked from the coloured row, and clicking it again clears it', () => {
  const onDefaultsChange = vi.fn();
  const { rerender } = render(panel({ onDefaultsChange }));
  const tiers = screen.getByRole('group', { name: 'Encounter tier' });

  fireEvent.click(within(tiers).getByRole('button', { name: /T3/ }));
  expect(onDefaultsChange).toHaveBeenCalledWith({ tier: 3 });

  rerender(panel({ onDefaultsChange, defaults: { ...DEFAULTS, tier: 3 } }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Encounter tier' })).getByRole('button', { name: /T3/ }));
  expect(onDefaultsChange).toHaveBeenLastCalledWith({ tier: null });
});

// The mount is the party's, and the map can say so without going back to the
// board — a party rides out of a city on the screen the GM is looking at.
test('the mount is picked on the map as well as on the board', () => {
  const onDefaultsChange = vi.fn();
  render(panel({ onDefaultsChange }));
  const mounts = screen.getByRole('group', { name: 'Mount' });

  fireEvent.click(within(mounts).getByRole('button', { name: /×3/ }));
  expect(onDefaultsChange).toHaveBeenCalledWith({ mountSpeed: 3 });
});

test('the weather card says what the weather costs, not only what it is', () => {
  render(panel());
  expect(screen.getByText('×2 travel · Disadvantage')).toBeInTheDocument();
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

// The panel is what a GM who looked away reads: the bubble has faded by then.
test('the panel keeps the last hex the party walked into', () => {
  const onOpenResult = vi.fn();
  render(panel({
    hasResult: true,
    onOpenResult,
    lastHex: {
      hex: { q: 4, r: 2, terrain: 'Forest' },
      headline: 'Wandering Monster',
      lines: ['d6 1 vs 2', 'Encounter Table: Hard'],
      clock: CLOCK,
      fromThisSession: true,
      onThisScene: true,
    },
  }));

  expect(screen.getByText('Last hex visited')).toBeInTheDocument();
  expect(screen.getByText('Hex 4, 2 · Forest (4h)')).toBeInTheDocument();
  expect(screen.getByText('Encounter Table: Hard')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /see the rolls/i }));
  expect(onOpenResult).toHaveBeenCalled();
});

// A hex the campaign row remembers, entered from the GM Board or before this tab
// was opened: the coordinates are still worth having, the rolls are not ours.
test('a hex entered elsewhere is shown without pretending we rolled it', () => {
  render(panel({
    hasResult: false,
    lastHex: {
      hex: { q: 1, r: 1, terrain: null },
      headline: null,
      lines: [],
      clock: CLOCK,
      fromThisSession: false,
      onThisScene: true,
    },
  }));

  expect(screen.getByText('Entered before this session.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /see the rolls/i })).toBeNull();
});

test('the bubble answers over the hex, and opens the rolls when clicked', () => {
  const onOpen = vi.fn();
  render(
    <HexBubble
      bubble={{
        hex: { q: 4, r: 2, terrain: 'Forest' },
        headline: 'Wandering Monster',
        lines: ['d6 1 vs 2', 'Encounter: Hard'],
        clock: CLOCK,
      }}
      x={120}
      y={80}
      onOpen={onOpen}
    />,
  );

  // Where, what, and under which sky — the whole answer, so the dialog stays
  // optional rather than the only place the loot is written down.
  expect(screen.getByText('Hex 4, 2 · Forest (4h)')).toBeInTheDocument();
  expect(screen.getByText('Wandering Monster')).toBeInTheDocument();
  expect(screen.getByText('Encounter: Hard')).toBeInTheDocument();
  expect(screen.getByText(/rain · heavy · dis/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /wandering monster — see every roll/i }));
  expect(onOpen).toHaveBeenCalled();
});

test('no result means no dialog on the map', () => {
  render(<HexResultDialog result={null} onClose={noop} />);
  expect(screen.queryByRole('dialog')).toBeNull();
});
