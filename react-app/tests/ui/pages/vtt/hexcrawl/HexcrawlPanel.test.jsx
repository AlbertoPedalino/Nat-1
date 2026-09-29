import { fireEvent, render as baseRender, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import HexcrawlPanel from '../../../../../src/pages/vtt/hexcrawl/HexcrawlPanel.jsx';
import HexResultDialog from '../../../../../src/pages/vtt/hexcrawl/HexResultDialog.jsx';
import HexBubble from '../../../../../src/pages/vtt/hexcrawl/HexBubble.jsx';
import { createDefaultCoreState } from '../../../../../src/pages/gmboard/state/defaultState.js';
import { createDefaultTables } from '../../../../../src/pages/gmboard/tables/defaultTables.js';

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
    onArmedChange={noop}
    {...overrides}
  />
);

test('the panel shows the campaign clock and its weather before anything is picked', () => {
  render(panel());
  expect(screen.getByText(/rain · heavy/i)).toBeInTheDocument();
  // What a click does is behind an icon: over a map, prose costs board.
  expect(screen.getByRole('button', { name: 'About clicking a hex' })).toBeInTheDocument();
  // Heavy rain costs the party advantage, and the panel says so rather than
  // leaving the GM to remember the table.
  expect(screen.getByText(/disadvantage/i)).toBeInTheDocument();
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

// The cost of a click is said before the click: terrain, weather and mount
// together, and the hour the party will arrive.
test('the panel says how long the next hex takes and when the party arrives', () => {
  render(panel({ defaults: { ...DEFAULTS, terrain: 'Forest', mountSpeed: 2 } }));
  // Forest 4h, doubled by heavy rain, halved by the mount.
  expect(screen.getByText('Next hex · 4h')).toBeInTheDocument();
  expect(screen.getByText(/Forest 4h → 4h \(weather, ×2 mount\)/)).toBeInTheDocument();
  expect(screen.getByText('Arrive 12:00')).toBeInTheDocument();
});

test('the next hex asks for a terrain before it can say how long it takes', () => {
  render(panel({ defaults: { ...DEFAULTS, terrain: null } }));
  expect(screen.getByText(/pick a terrain to see how long it takes/i)).toBeInTheDocument();
});

// The corner reports; it does not ask. Everything a hex is rolled with is read
// at a glance, and a missing piece is marked where it would be.
test('the panel sums up the setup instead of asking for it', () => {
  render(panel({ defaults: { ...DEFAULTS, mountSpeed: 2 } }));
  const setup = screen.getByLabelText('Hexcrawl setup');
  expect(within(setup).getByText('Summer')).toBeInTheDocument();
  expect(within(setup).getByText('Unexplored')).toBeInTheDocument();
  expect(within(setup).getByText(/^T1/)).toBeInTheDocument();
  expect(within(setup).getByText('Riding')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.queryByRole('group', { name: 'Encounter tier' })).toBeNull();
});

test('a missing setting points at the settings', () => {
  const onOpenSettings = vi.fn();
  render(panel({ defaults: { terrain: 'Plains', pop: null, tier: null }, onOpenSettings }));
  expect(within(screen.getByLabelText('Hexcrawl setup')).getByText('No tier')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
  expect(onOpenSettings).toHaveBeenCalled();
});
