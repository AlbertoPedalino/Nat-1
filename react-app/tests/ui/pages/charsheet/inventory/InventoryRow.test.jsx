import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { expect, test, vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import InventoryRow from '../../../../../src/pages/charsheet/inventory/InventoryRow.jsx';
import { rarityTone } from '../../../../../src/shared/character/inventory/itemRarity.js';
import { textTone } from '../../../../../src/shared/ui/pressable.js';

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

// The name wears the rarity's colour as text reads it on the palette
// (textTone: as it is on a dark one, deepened on a light one).
test("a magic item's name and bar wear its rarity's colour; a mundane one neither", () => {
  const flameTongue = { name: 'Flame Tongue Longsword', type: 'M', rarity: 'rare', qty: 1 };
  const rareName = textTone(rarityTone(flameTongue));
  const { container, unmount } = renderRow(flameTongue, actions());
  const name = screen.getByText('Flame Tongue Longsword');
  expect(getComputedStyle(name).color).toBe(rareName);
  expect(container.querySelector('[aria-hidden="true"][class*="MuiBox"]')).not.toBeNull();
  unmount();
  renderRow({ name: 'Rope', type: 'G', rarity: 'none', qty: 1 }, actions());
  expect(getComputedStyle(screen.getByText('Rope')).color).not.toBe(rareName);
});
