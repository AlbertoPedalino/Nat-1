import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import HPBlock from '../../../../../src/pages/charsheet/resources/HPBlock.jsx';
import { HP_TONE_COLORS } from '../../../../../src/shared/ui/colors.js';

const SHEET = {
  currentHP: 0, maxHP: 20, tempHP: 0, maxHPBonus: 0, exhaustionLevel: 0,
  deathSaves: { success: 1, fail: 0 }, activeConditions: [],
};

function show(sheet, props = {}) {
  return render(<ThemeProvider theme={theme}><HPBlock sheet={{ ...SHEET, ...sheet }} {...props} /></ThemeProvider>);
}

test('a dying character rolls and sets death saves with the shared dots', () => {
  const onDeathSaveSet = vi.fn();
  show({}, { onDeathSaveSet, onDeathSave: vi.fn() });
  expect(screen.getByRole('button', { name: 'Roll' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Failure 2' }));
  expect(onDeathSaveSet).toHaveBeenLastCalledWith('fail', 2);
  // The dot that is already the count takes one back.
  fireEvent.click(screen.getByRole('button', { name: 'Success 1' }));
  expect(onDeathSaveSet).toHaveBeenLastCalledWith('success', 0);
});

test('three failed saves or the Dead condition is dead, as on the map and in the builder', () => {
  const { unmount } = show({ deathSaves: { success: 0, fail: 3 } });
  expect(screen.getByText('Dead')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Roll' })).not.toBeInTheDocument();
  // Still correctable.
  expect(screen.getByRole('button', { name: 'Failure 3' })).toBeInTheDocument();
  unmount();
  show({ activeConditions: ['dead'] });
  expect(screen.getByText('Dead')).toBeInTheDocument();
});

test('the last exhaustion level is final: no death saves', () => {
  show({ exhaustionLevel: 6 });
  expect(screen.getByText('Dead — Exhaustion 6')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Failure 1' })).not.toBeInTheDocument();
});

test('hit points take the same tone as everywhere else: critical at a quarter', () => {
  show({ currentHP: 4, deathSaves: { success: 0, fail: 0 } });
  expect(screen.getByText('4')).toHaveStyle({ color: HP_TONE_COLORS.critical });
});
