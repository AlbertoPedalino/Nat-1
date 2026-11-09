import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar from '../../../../../src/pages/charsheet/layout/TopBar.jsx';
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: vi.fn() }) }));

const character = {
  name: 'Arannis',
  className: 'Wizard',
  level: 1,
  extraClasses: [],
};

test('shared rolls show the monster or player name and note in the player log', () => {
  render(
    <MemoryRouter>
      <TopBar C={character} sheet={{ xpStored: 0 }} embedded rollLog={[{
        timestamp: 3, actorName: 'Goblin', label: 'Claw', detail: '1d20+5',
        total: 17, rolls: [{ v: 12, faces: 20 }], meta: { bonus: 5 }, note: 'Hit',
      }]} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Roll log, 1 roll' }));
  expect(screen.getByText('Goblin')).toBeInTheDocument();
  expect(screen.getByText('Claw')).toBeInTheDocument();
  expect(screen.getByText('Hit')).toBeInTheDocument();
});

test('the sheet roll log omits a zero stat modifier', () => {
  render(
    <MemoryRouter>
      <TopBar
        C={character}
        sheet={{ xpStored: 0 }}
        embedded
        rollLog={[{
          timestamp: 1,
          label: 'Strength Check',
          detail: 'd20 = 12',
          total: 12,
          rolls: [{ v: 12, faces: 20, kept: true }],
          meta: { bonus: 0, kept: 12 },
        }]}
      />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Roll log, 1 roll' }));

  expect(screen.getByRole('img', { name: 'd20 showing 12' })).toBeInTheDocument();
  expect(screen.getByText('=')).toBeInTheDocument();
  expect(screen.queryByText(/\+\s*0/)).not.toBeInTheDocument();
});

test('the sheet roll log does not invent a zero modifier for plain custom dice', () => {
  render(
    <MemoryRouter>
      <TopBar
        C={character}
        sheet={{ xpStored: 0 }}
        embedded
        rollLog={[{
          timestamp: 2,
          label: 'Custom Roll — 1d6',
          detail: '1d6',
          total: 4,
          rolls: [{ v: 4, faces: 6 }],
        }]}
      />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Roll log, 1 roll' }));

  expect(screen.getByRole('img', { name: 'd6 showing 4' })).toBeInTheDocument();
  expect(screen.getByText('=')).toBeInTheDocument();
  expect(screen.queryByText(/\+\s*0/)).not.toBeInTheDocument();
});

test('a read-only sheet shows its READ ONLY badge', () => {
  render(
    <MemoryRouter>
      <TopBar C={character} sheet={{ xpStored: 0 }} embedded readOnly />
    </MemoryRouter>,
  );
  expect(screen.getByText('READ ONLY')).toBeInTheDocument();
});
