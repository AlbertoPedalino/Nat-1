import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SheetDiceDock from '../../../../../src/pages/charsheet/layout/SheetDiceDock.jsx';
import { createValueStore } from '../../../../../src/shared/valueStore.js';

// The sheet's floating dice: the roll log it opens.

test('shared rolls show the monster or player name and note in the player log', () => {
  render(
    <MemoryRouter>
      <SheetDiceDock logStore={createValueStore([{
        timestamp: 3, actorName: 'Goblin', label: 'Claw', detail: '1d20+5',
        total: 17, rolls: [{ v: 12, faces: 20 }], meta: { bonus: 5 }, note: 'Hit',
      }])} />
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
      <SheetDiceDock logStore={createValueStore([{
          timestamp: 1,
          label: 'Strength Check',
          detail: 'd20 = 12',
          total: 12,
          rolls: [{ v: 12, faces: 20, kept: true }],
          meta: { bonus: 0, kept: 12 },
        }])}
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
      <SheetDiceDock logStore={createValueStore([{
          timestamp: 2,
          label: 'Custom Roll — 1d6',
          detail: '1d6',
          total: 4,
          rolls: [{ v: 4, faces: 6 }],
        }])}
      />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Roll log, 1 roll' }));

  expect(screen.getByRole('img', { name: 'd6 showing 4' })).toBeInTheDocument();
  expect(screen.getByText('=')).toBeInTheDocument();
  expect(screen.queryByText(/\+\s*0/)).not.toBeInTheDocument();
});

test('it floats at the bottom without taking clicks from what passes under it', () => {
  render(<SheetDiceDock logStore={createValueStore([])} />);
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

test('on a phone it is a compact pill of two icons, always out', () => {
  const matchMedia = asPhone();
  try {
    render(<SheetDiceDock logStore={createValueStore([])} />);
    expect(screen.getByRole('button', { name: 'Roll dice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll log, 0 rolls' })).toBeInTheDocument();
    expect(screen.queryByText('Roll')).not.toBeInTheDocument();
  } finally {
    matchMedia.mockRestore();
  }
});

test('from a tablet up it keeps its labels', () => {
  render(<SheetDiceDock logStore={createValueStore([])} />);
  expect(screen.getByRole('button', { name: 'Roll' })).toBeInTheDocument();
});

test('on its own page the end-of-scroll stretch is off while the sheet is open', () => {
  const root = document.documentElement;
  const { unmount } = render(<SheetDiceDock logStore={createValueStore([])} />);
  expect(root.style.overscrollBehaviorY).toBe('none');
  unmount();
  expect(root.style.overscrollBehaviorY).toBe('');
  render(<SheetDiceDock embedded logStore={createValueStore([])} />);
  expect(root.style.overscrollBehaviorY).toBe('');
});
