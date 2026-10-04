import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import RollView from '../../../../../src/pages/gmboard/tables/RollView.jsx';

const board = vi.hoisted(() => ({ state: null, dispatch: vi.fn(), rollOnTable: vi.fn() }));

vi.mock('../../../../../src/pages/gmboard/state/GmBoardContext.jsx', () => ({
  useGmBoard: () => board,
}));

const EVENT_ROLL = {
  id: 'roll_2',
  tableId: 'event',
  tier: null,
  dice: [{ sides: 20, value: 3 }, { sides: 20, value: 3 }],
  sum: 6,
  data: { r: 6, name: 'Encounter', type: 'encounter' },
  dc: null,
};

const TRAP_ROLL = {
  id: 'roll_1',
  tableId: 'trap',
  tier: 1,
  dice: [{ sides: 8, value: 1 }, { sides: 12, value: 1 }],
  sum: 2,
  data: { r: 2, tipo: 'Deadly', lv: '4', dc: 15, danno: '11 (2d10)' },
  dc: null,
};

const LOOT_ROLL = {
  id: 'roll_3',
  tableId: 'loot',
  tier: null,
  dice: [{ sides: 8, value: 8 }, { sides: 12, value: 9 }],
  sum: 17,
  data: { r: 17, tipo: 'Magic Item', rarita: 'Uncommon', qualita: 'Masterwork', valore: '20×Lv', extra: '' },
  dc: { label: 'DC to find it', dice: [{ sides: 8, value: 1 }, { sides: 12, value: 12 }], sum: 13 },
};

const renderView = (state) => {
  board.state = { rollTier: 2, rolls: [], ...state };
  return render(<ThemeProvider theme={theme}><RollView /></ThemeProvider>);
};

beforeEach(() => {
  board.dispatch.mockReset();
  board.rollOnTable.mockReset();
});

test('every table has its own roll button and starts empty', () => {
  renderView();
  ['Event', 'Encounter', 'Loot', 'Trap', 'Complication', 'Environment'].forEach((label) => {
    expect(screen.getByRole('button', { name: `Roll ${label}` })).toBeInTheDocument();
  });
  expect(screen.getAllByText('Not rolled yet.')).toHaveLength(6);
  expect(screen.getByText('No rolls yet.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Roll Loot' }));
  expect(board.rollOnTable).toHaveBeenCalledWith('loot');
});

test('a result is shown on its card and in the history', () => {
  renderView({ rolls: [EVENT_ROLL, TRAP_ROLL] });
  expect(screen.getAllByText('Not rolled yet.')).toHaveLength(4);

  const history = screen.getByRole('list', { name: 'Roll history, newest first' });
  const rows = within(history).getAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(within(rows[0]).getByText('d20(3)+d20(3)=6')).toBeInTheDocument();
  expect(within(rows[1]).getByText('Trap T1')).toBeInTheDocument();
  expect(within(rows[1]).getByText('Level 4 · DC 15 · Damage 11 (2d10)')).toBeInTheDocument();
  // The trap was rolled at another tier than the one now selected.
  expect(screen.getByText('Table roll: d8(1)+d12(1)=2 · rolled at T1')).toBeInTheDocument();
});

test('a result with a check shows its DC on the card and in the history', () => {
  renderView({ rolls: [LOOT_ROLL, TRAP_ROLL] });
  // On the Loot card as its own field, with the dice behind it.
  expect(screen.getByText('DC to find it').closest('div')).toHaveTextContent('DC to find it13DC roll: d8(1)+d12(12)=13');
  // The roll on the table itself is named apart from the DC roll.
  expect(screen.getByText('Table roll: d8(8)+d12(9)=17')).toBeInTheDocument();
  // And at the end of its history row; the trap has none.
  expect(screen.getByText('Rarity Uncommon · Quality Masterwork · Value 20×Lv · DC to find it 13')).toBeInTheDocument();
  expect(screen.queryByText(/DC to (spot|interact)/)).not.toBeInTheDocument();
});

test('each field of a result sits under its own label', () => {
  renderView({ rolls: [TRAP_ROLL] });
  const field = (label) => screen.getByText(label, { selector: 'dt' }).closest('div');
  expect(field('Trap')).toHaveTextContent('TrapDeadly');
  expect(field('Level')).toHaveTextContent('Level4');
  expect(field('DC')).toHaveTextContent('DC15detect & disarm');
  expect(field('Damage')).toHaveTextContent('Damage11 (2d10)');
});

test('a follow-up table is offered, and rolled only when asked', () => {
  renderView({ rolls: [EVENT_ROLL] });
  expect(board.rollOnTable).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Then roll Encounter' }));
  expect(board.rollOnTable).toHaveBeenCalledWith('encounter');
});

test('tier and clear go through the board reducer', () => {
  renderView({ rolls: [TRAP_ROLL] });

  fireEvent.click(screen.getByRole('button', { name: /T3/ }));
  expect(board.dispatch).toHaveBeenCalledWith({ type: 'setRollTier', tier: 3 });

  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(board.dispatch).toHaveBeenCalledWith({ type: 'clearRolls' });
});
