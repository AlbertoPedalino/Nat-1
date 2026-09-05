import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import RollLog from '../../pages/encounterbuilder/components/RollLog.jsx';
import RollLogPanel from '../../pages/vtt/components/RollLogPanel.jsx';
import TopBar from '../../pages/charsheet/components/TopBar.jsx';

const context = vi.hoisted(() => ({ state: { rollLog: [] }, dispatch: vi.fn() }));
vi.mock('../../pages/encounterbuilder/state/EncounterBuilderContext.jsx', () => ({ useEncounterBuilder: () => context }));
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
  if (panel === 'player') fireEvent.click(screen.getByRole('button', { name: 'LOG (3)' }));
  const log = panel === 'player' ? within(screen.getByRole('dialog')) : screen;
  expect(log.getByText('24')).toHaveStyle({ color: '#edd48a' });
  expect(log.getByText('5')).toHaveStyle({ color: '#de675f' });
  expect(log.getByText('26')).toHaveStyle({ color: '#eeeeee' });
  expect(log.getByText('Goblin').parentElement).toHaveStyle({ color: '#3498db' });
  expect(log.getByText('■B').parentElement).toHaveStyle({ color: '#3498db' });
  expect(log.getByText('Wizard').parentElement).toHaveStyle({ color: '#b05ce0' });
});
