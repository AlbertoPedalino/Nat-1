import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { expect, test, vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import InventoryRow from '../../../../../src/pages/charsheet/inventory/InventoryRow.jsx';

const PACT = { key: 'pactWeapon', label: 'Pact Weapon', activeLabel: 'Pact', types: ['M', 'R', 'WEAPON'], maxCount: 1 };
const ARCANE = { key: 'arcaneArmor', label: 'Arcane Armor', activeLabel: 'Arcane', types: ['LA', 'MA', 'HA'], maxCount: 1 };
const ATTUNEMENT = { full: false, context: {}, limit: 3 };

function actions() {
  return {
    qty: vi.fn(), charges: vi.fn(), remove: vi.fn(), equip: vi.fn(), equipSlot: vi.fn(), carried: vi.fn(),
    toggleFlag: vi.fn(), attune: vi.fn(), abilityChoice: vi.fn(), writeScroll: vi.fn(), consumeTome: vi.fn(),
  };
}

function renderRow(item, rowActions, defs = [PACT, ARCANE]) {
  return render(
    <ThemeProvider theme={theme}>
      <InventoryRow item={item} index={4} character={{}} penaltyMsg="" itemFlagDefs={defs} attunement={ATTUNEMENT} actions={rowActions} />
    </ThemeProvider>,
  );
}

test('a carried weapon offers only the flags that fit it, and each control acts on its own index', () => {
  const rowActions = actions();
  renderRow({ name: 'Longsword', type: 'M', property: ['V'], qty: 1 }, rowActions);
  expect(screen.queryByRole('button', { name: 'Arcane Armor' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pact Weapon' }));
  expect(rowActions.toggleFlag).toHaveBeenCalledWith(4, PACT);
  fireEvent.click(screen.getByRole('button', { name: 'Stash' }));
  expect(rowActions.carried).toHaveBeenCalledWith(4);
});

test('a set flag shows its active label', () => {
  renderRow({ name: 'Longsword', type: 'M', flags: ['pactWeapon'] }, actions());
  expect(screen.getByRole('button', { name: 'Pact' })).toBeInTheDocument();
});

test('a stashed item offers no flag and no equip', () => {
  renderRow({ name: 'Chain Mail', type: 'HA', carried: false }, actions());
  expect(screen.queryByRole('button', { name: 'Arcane Armor' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Equip' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Carry' })).toBeInTheDocument();
});
