import { fireEvent, render as baseRender, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import HexcrawlSettingsDialog from '../../../../../src/pages/vtt/hexcrawl/HexcrawlSettingsDialog.jsx';
import HexcrawlCorner from '../../../../../src/pages/vtt/hexcrawl/HexcrawlCorner.jsx';
import { createDefaultCoreState } from '../../../../../src/pages/gmboard/state/defaultState.js';
import { createDefaultTables } from '../../../../../src/pages/gmboard/tables/defaultTables.js';

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

const dialog = (overrides = {}) => (
  <HexcrawlSettingsDialog
    open
    onClose={noop}
    board={BOARD}
    clock={CLOCK}
    clockLinked
    defaults={DEFAULTS}
    onDefaultsChange={noop}
    onSeasonChange={noop}
    onClockChange={noop}
    onClockAdvance={noop}
    {...overrides}
  />
);

const group = (name) => screen.getByRole('group', { name });

test('the season is set on the campaign, and picking it again clears it', () => {
  const onSeasonChange = vi.fn();
  render(dialog({ onSeasonChange }));
  fireEvent.click(within(group('Season')).getByRole('button', { name: /Autumn/ }));
  expect(onSeasonChange).toHaveBeenCalledWith('Autumn');
  fireEvent.click(within(group('Season')).getByRole('button', { name: /Summer/ }));
  expect(onSeasonChange).toHaveBeenLastCalledWith(null);
});

test('the defaults are what an untouched hex is assumed to be', () => {
  const onDefaultsChange = vi.fn();
  render(dialog({ onDefaultsChange }));
  fireEvent.click(within(group('Terrain')).getByRole('button', { name: /Mountain/ }));
  expect(onDefaultsChange).toHaveBeenCalledWith({ terrain: 'Mountain' });
  fireEvent.click(within(group('Population')).getByRole('button', { name: /Frontier/ }));
  expect(onDefaultsChange).toHaveBeenLastCalledWith({ pop: 'frontier' });
  fireEvent.click(within(group('Terrain')).getByRole('button', { name: /Plains/ }));
  expect(onDefaultsChange).toHaveBeenLastCalledWith({ terrain: null });
});

// The tier keeps the GM Board's colours and its one-click row.
test('the tier is picked from the coloured row, and clicking it again clears it', () => {
  const onDefaultsChange = vi.fn();
  const { rerender } = render(dialog({ onDefaultsChange }));
  fireEvent.click(within(group('Encounter tier')).getByRole('button', { name: /T3/ }));
  expect(onDefaultsChange).toHaveBeenCalledWith({ tier: 3 });

  rerender(dialog({ onDefaultsChange, defaults: { ...DEFAULTS, tier: 3 } }));
  fireEvent.click(within(group('Encounter tier')).getByRole('button', { name: /T3/ }));
  expect(onDefaultsChange).toHaveBeenLastCalledWith({ tier: null });
});

test('the mount is picked on the map as well as on the board', () => {
  const onDefaultsChange = vi.fn();
  render(dialog({ onDefaultsChange }));
  fireEvent.click(within(group('Mount')).getByRole('button', { name: /×3/ }));
  expect(onDefaultsChange).toHaveBeenCalledWith({ mountSpeed: 3 });
});

test('the date, the time and the weather can be changed from the map', () => {
  const onClockChange = vi.fn();
  const onClockAdvance = vi.fn();
  render(dialog({ onClockChange, onClockAdvance }));

  fireEvent.change(screen.getByLabelText('Day'), { target: { value: '15' } });
  fireEvent.change(screen.getByLabelText('Month'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Time (HH:MM)'), { target: { value: '18:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Set' }));
  expect(onClockChange).toHaveBeenCalledWith({ day: 15, month: 3, year: 1000, min: 1110 });

  fireEvent.click(screen.getByRole('button', { name: '+4h' }));
  expect(onClockAdvance).toHaveBeenCalledWith(4);
  fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '2.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Advance the clock' }));
  expect(onClockAdvance).toHaveBeenLastCalledWith(2.5);

  const weather = group('Weather');
  expect(within(weather).getAllByRole('button', { pressed: true })).toHaveLength(1);
  // Snow's Light is the second "Light" in the row: Rain's comes first.
  fireEvent.click(within(weather).getAllByRole('button', { name: /Light/ })[1]);
  expect(onClockChange).toHaveBeenLastCalledWith({ meteo: 'Snow', intensity: 'Light' });
});

test('an impossible date is refused in place', () => {
  const onClockChange = vi.fn();
  render(dialog({ onClockChange }));
  fireEvent.change(screen.getByLabelText('Day'), { target: { value: '32' } });
  fireEvent.click(screen.getByRole('button', { name: 'Set' }));
  expect(onClockChange).not.toHaveBeenCalled();
  expect(screen.getByText('Invalid date or time.')).toBeInTheDocument();
});

test('without a linked board nothing can be changed', () => {
  render(dialog({ board: null }));
  expect(screen.getByText(/no hexcrawl board is linked/i)).toBeInTheDocument();
  expect(within(group('Encounter tier')).getByRole('button', { name: /T1/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled();
});

test('the gear in the corner opens the settings', () => {
  render(
    <HexcrawlCorner
      open
      board={BOARD}
      clock={CLOCK}
      clockLinked
      defaults={DEFAULTS}
      armed
      onArmedChange={noop}
      onDefaultsChange={noop}
      onSeasonChange={noop}
    />,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Hexcrawl settings' }));
  expect(within(screen.getByRole('dialog')).getByText('Hexcrawl settings')).toBeInTheDocument();
});
