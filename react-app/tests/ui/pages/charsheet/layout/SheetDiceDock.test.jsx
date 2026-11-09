import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SheetDiceDock from '../../../../../src/pages/charsheet/layout/SheetDiceDock.jsx';

// The sheet's floating dice: the roll log it opens.

test('shared rolls show the monster or player name and note in the player log', () => {
  render(
    <MemoryRouter>
      <SheetDiceDock rollLog={[{
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
      <SheetDiceDock rollLog={[{
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
      <SheetDiceDock rollLog={[{
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

test('it floats at the bottom without taking clicks from what passes under it', () => {
  render(<SheetDiceDock rollLog={[]} />);
  const group = screen.getByRole('group', { name: 'Dice' });
  const band = group.parentElement;
  expect(band).toHaveStyle({ position: 'sticky', pointerEvents: 'none' });
  expect(getComputedStyle(group).pointerEvents).not.toBe('none');
  const [roll, log] = screen.getAllByRole('button');
  expect(roll).toHaveTextContent('Roll');
  expect(log).toHaveAccessibleName('Roll log, 0 rolls');
});

// A phone as MUI asks for one: the breakpoint below `sm`.
function asPhone() {
  return vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query.includes('max-width'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

test('on a phone its chevron tucks it into a handle that brings it back, and the choice is kept', () => {
  localStorage.clear();
  const matchMedia = asPhone();
  try {
    const { unmount } = render(<SheetDiceDock rollLog={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide dice' }));
    expect(screen.queryByRole('group', { name: 'Dice' })).not.toBeInTheDocument();
    unmount();
    render(<SheetDiceDock rollLog={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show dice' }));
    expect(screen.getByRole('group', { name: 'Dice' })).toBeInTheDocument();
  } finally {
    matchMedia.mockRestore();
  }
});

test('from a tablet up it is always out, with nothing to tuck it away', () => {
  localStorage.setItem('gb:sheet:dice-dock-hidden', '1');
  render(<SheetDiceDock rollLog={[]} />);
  expect(screen.getByRole('group', { name: 'Dice' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hide dice' })).not.toBeInTheDocument();
  localStorage.clear();
});

test('on its own page the end-of-scroll stretch is off while the sheet is open', () => {
  const root = document.documentElement;
  const { unmount } = render(<SheetDiceDock rollLog={[]} />);
  expect(root.style.overscrollBehaviorY).toBe('none');
  unmount();
  expect(root.style.overscrollBehaviorY).toBe('');
  render(<SheetDiceDock embedded rollLog={[]} />);
  expect(root.style.overscrollBehaviorY).toBe('');
});
