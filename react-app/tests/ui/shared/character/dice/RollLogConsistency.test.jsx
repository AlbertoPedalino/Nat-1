import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import DiceControl from '../../../../../src/shared/character/dice/DiceControl.jsx';
import RollsButton from '../../../../../src/pages/vtt/rolls/RollsButton.jsx';
import SheetDiceDock from '../../../../../src/pages/charsheet/layout/SheetDiceDock.jsx';
import { UI_COLORS } from '../../../../../src/shared/ui/colors.js';
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: vi.fn() }) }));

const theme = createTheme({ palette: { mode: 'dark', text: { primary: '#eeeeee' } } });

const rolls = [
  { id: 'crit', actorName: 'Goblin', actorColor: '#3498db', actorShape: '■', actorLabel: 'B', label: 'Claw', total: 24, rolls: [{ v: 20, faces: 20 }] },
  { id: 'fail', actorName: 'Wizard', actorColor: '#b05ce0', label: 'Attack', total: 5, rolls: [{ v: 1, faces: 20 }] },
  { id: 'normal', actorName: 'GM', label: 'Damage', total: 26, rolls: [{ v: 6, faces: 6 }] },
];

// Every screen that rolls shows the same control and the same log: the
// encounter builder's DiceControl, the map's corner pill and the sheet's dock.
function renderSurface(surface, log) {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        {surface === 'encounter' ? <DiceControl log={log} onRoll={vi.fn()} onClear={vi.fn()} /> : null}
        {surface === 'map' ? <RollsButton feed={log} onCustomRoll={vi.fn()} onClear={vi.fn()} /> : null}
        {surface === 'player' ? <SheetDiceDock rollLog={log} /> : null}
      </MemoryRouter>
    </ThemeProvider>,
  );
  const [roll, logButton] = within(screen.getByRole('group', { name: 'Dice' })).getAllByRole('button');
  expect(roll).toHaveAccessibleName(/roll/i);
  fireEvent.click(logButton);
  return within(screen.getByRole('presentation'));
}

test.each(['encounter', 'map', 'player'])('%s: roll first, then the log with the shared result and actor colours', (surface) => {
  const log = renderSurface(surface, rolls);
  expect(log.getByText('24')).toHaveStyle({ color: UI_COLORS.accentText });
  expect(log.getByText('5')).toHaveStyle({ color: UI_COLORS.danger });
  expect(log.getByText('26')).toHaveStyle({ color: '#eeeeee' });
  expect(log.getByText('Goblin').parentElement).toHaveStyle({ color: '#3498db' });
  expect(log.getByText('■B').parentElement).toHaveStyle({ color: '#3498db' });
  expect(log.getByText('Wizard').parentElement).toHaveStyle({ color: '#b05ce0' });
});

test('the log places dice, modifier and total in one calculation without bracketed duplicates', () => {
  const feed = [
    { id: 'heal', actorName: 'Johnny Walker', label: 'Healing Word — Heal', detail: '2d4+3', total: 8, rolls: [{ v: 4, faces: 4 }, { v: 1, faces: 4 }] },
    { id: 'damage', actorName: 'Dire Wolf', label: 'Damage', detail: '1d10 [5] + 3', total: 8, rolls: [{ v: 5, faces: 10 }] },
  ];
  const log = renderSurface('encounter', feed);
  expect(log.getByText('2d4 + 3')).toBeInTheDocument();
  expect(log.getByText('1d10 + 3')).toBeInTheDocument();
  expect(log.queryByText(/\[5\]/)).not.toBeInTheDocument();
  const calculations = log.getAllByRole('group', { name: 'Roll calculation' });
  expect(within(calculations[0]).getAllByRole('img')).toHaveLength(2);
  expect(within(calculations[1]).getAllByRole('img')).toHaveLength(1);
  for (const calculation of calculations) {
    expect(within(calculation).getByText('+ 3')).toBeInTheDocument();
    expect(within(calculation).getByText('=')).toBeInTheDocument();
    expect(within(calculation).getByText('8')).toBeInTheDocument();
  }
});
