import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar from './TopBar.jsx';

const character = {
  name: 'Arannis',
  className: 'Wizard',
  level: 1,
  extraClasses: [],
};

test('the sheet roll log shows an explicit zero stat modifier', () => {
  render(
    <MemoryRouter>
      <TopBar
        C={character}
        sheet={{ xpStored: 0 }}
        embedded
        rollLog={[{
          timestamp: 1,
          label: 'Strength Check',
          detail: 'd20 +0 = 12',
          total: 12,
          rolls: [{ v: 12, faces: 20, kept: true }],
          meta: { bonus: 0, kept: 12 },
        }]}
      />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'LOG (1)' }));

  expect(screen.getByText('12 (d20) + 0 = 12')).toBeInTheDocument();
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

  fireEvent.click(screen.getByRole('button', { name: 'LOG (1)' }));

  expect(screen.getByText('4 (d6) = 4')).toBeInTheDocument();
  expect(screen.queryByText('4 (d6) + 0 = 4')).not.toBeInTheDocument();
});
