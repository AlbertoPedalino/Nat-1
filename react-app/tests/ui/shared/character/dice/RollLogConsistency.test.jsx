import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import RollLog from '../../../../../src/pages/encounterbuilder/rolls/RollLog.jsx';
import RollLogPanel from '../../../../../src/pages/vtt/rolls/RollLogPanel.jsx';
import TopBar from '../../../../../src/pages/charsheet/layout/TopBar.jsx';

const context = vi.hoisted(() => ({ state: { rollLog: [] }, dispatch: vi.fn() }));
vi.mock('../../../../../src/pages/encounterbuilder/state/EncounterBuilderContext.jsx', () => ({ useEncounterBuilder: () => context }));
const theme = createTheme({ palette: { mode: 'dark', text: { primary: '#eeeeee' } } });

const rolls = [
  { id: 'crit', actorName: 'Goblin', actorColor: '#3498db', actorShape: '■', actorLabel: 'B', label: 'Claw', total: 24, rolls: [{ v: 20, faces: 20 }] },
  { id: 'fail', actorName: 'Wizard', actorColor: '#b05ce0', label: 'Attack', total: 5, rolls: [{ v: 1, faces: 20 }] },
  { id: 'normal', actorName: 'GM', label: 'Damage', total: 26, rolls: [{ v: 6, faces: 6 }] },
];

test.each(['encounter', 'map', 'player'])('%s log uses the same result colours and preserves the actor marker colours', (panel) => {
  context.state.rollLog = rolls.map((roll) => ({ ...roll, actor: roll.actorName, type: roll.label, result: roll.total, cls: 'high' }));
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        {panel === 'encounter' ? <RollLog /> : panel === 'map' ? <RollLogPanel feed={rolls} /> : (
          <TopBar C={{ name: 'Wizard', className: 'Wizard', level: 1, extraClasses: [] }} sheet={{ xpStored: 0 }} embedded rollLog={rolls} />
        )}
      </MemoryRouter>
    </ThemeProvider>,
  );
  if (panel === 'player') fireEvent.click(screen.getByRole('button', { name: 'Roll log, 3 rolls' }));
  const log = panel === 'player' ? within(screen.getByRole('dialog')) : screen;
  expect(log.getByText('24')).toHaveStyle({ color: '#edd48a' });
  expect(log.getByText('5')).toHaveStyle({ color: '#de675f' });
  expect(log.getByText('26')).toHaveStyle({ color: '#eeeeee' });
  expect(log.getByText('Goblin').parentElement).toHaveStyle({ color: '#3498db' });
  expect(log.getByText('■B').parentElement).toHaveStyle({ color: '#3498db' });
  expect(log.getByText('Wizard').parentElement).toHaveStyle({ color: '#b05ce0' });
});

test.each(['encounter', 'map', 'player'])('%s log places dice, modifier and total in one calculation without bracketed duplicates', (panel) => {
  const feed = [
    { id: 'heal', actorName: 'Johnny Walker', label: 'Healing Word — Heal', detail: '2d4+3', total: 8, rolls: [{ v: 4, faces: 4 }, { v: 1, faces: 4 }] },
    { id: 'damage', actorName: 'Dire Wolf', label: 'Damage', detail: '1d10 [5] + 3', total: 8, rolls: [{ v: 5, faces: 10 }] },
  ];
  context.state.rollLog = feed.map((roll) => ({ ...roll, actor: roll.actorName, type: roll.label, result: roll.total, mathStr: roll.detail }));
  render(<MemoryRouter>
    {panel === 'encounter' ? <RollLog /> : panel === 'map' ? <RollLogPanel feed={feed} /> : (
      <TopBar C={{ name: 'Johnny Walker', className: 'Bard', level: 1, extraClasses: [] }} sheet={{ xpStored: 0 }} embedded rollLog={feed} />
    )}
  </MemoryRouter>);
  if (panel === 'player') fireEvent.click(screen.getByRole('button', { name: 'Roll log, 2 rolls' }));
  expect(screen.getByText('2d4 + 3')).toBeInTheDocument();
  expect(screen.getByText('1d10 + 3')).toBeInTheDocument();
  expect(screen.queryByText(/\[5\]/)).not.toBeInTheDocument();
  const calculations = screen.getAllByRole('group', { name: 'Roll calculation' });
  expect(within(calculations[0]).getAllByRole('img')).toHaveLength(2);
  expect(within(calculations[1]).getAllByRole('img')).toHaveLength(1);
  for (const calculation of calculations) {
    expect(within(calculation).getByText('+ 3')).toBeInTheDocument();
    expect(within(calculation).getByText('=')).toBeInTheDocument();
    expect(within(calculation).getByText('8')).toBeInTheDocument();
  }
});
