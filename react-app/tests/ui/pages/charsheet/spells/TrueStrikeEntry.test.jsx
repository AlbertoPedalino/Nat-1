import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { expect, test, vi } from 'vitest';
import SpellEntry from '../../../../../src/pages/charsheet/spells/SpellEntry.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';
import { ProficiencySetsProvider } from '../../../../../src/pages/charsheet/proficiency/ProficiencySetsContext.jsx';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installCantrips from '../../../../../src/adapters/spells/cantrips.js';
import { spellWeaponKey } from '../../../../../src/pages/charsheet/actions/actionsTabLogic.js';
import { theme } from '../../../../../src/app/theme.js';

installCantrips(adapterRegistry);

const trueStrike = {
  name: 'True Strike',
  source: 'XPHB',
  level: 0,
  spellcastingAbility: 'int',
  entries: ["Guided by a flash of magical insight, you make one attack with the weapon used in the spell's casting."],
  scalingLevelDice: { label: 'extra Radiant damage', scaling: { 5: '1d6', 11: '2d6', 17: '3d6' } },
};
const dagger = {
  name: 'Dagger', source: 'XPHB', type: 'M', weaponCategory: 'simple', property: ['F', 'L', 'T'], dmg1: '1d4', dmgType: 'P',
};
const staff = {
  name: 'Quarterstaff', source: 'XPHB', type: 'M', weaponCategory: 'simple', property: ['V'], dmg1: '1d6', dmg2: '1d8', dmgType: 'B',
  equipped: true, equippedSlot: 'twoHands',
};
const baseCharacter = {
  className: 'Wizard',
  level: 5,
  scoreMethod: 'manual',
  manualScores: { str: 10, dex: 12, con: 12, int: 16, wis: 10, cha: 10 },
  clsSnapshot: { startingProficiencies: { weapons: ['simple'] } },
};

function view(C, onUpdateCharacter) {
  return (
    <ThemeProvider theme={theme}>
      <SheetActionsProvider value={{ onUpdateCharacter, onRoll: vi.fn(), onShowToast: vi.fn() }}>
        <ProficiencySetsProvider character={C}>
          <SpellEntry entry={trueStrike} C={C} installedRegistry={adapterRegistry} inventory={[dagger, staff]} />
        </ProficiencySetsProvider>
      </SheetActionsProvider>
    </ThemeProvider>
  );
}

// The collapsed card rolls the weapon picked in the expanded one: its attack
// with the spellcasting ability, and its damage with the cantrip's extra dice.
test('True Strike rolls the picked weapon, and picking another one is saved on the character', () => {
  const onUpdateCharacter = vi.fn();
  const { rerender } = render(view(baseCharacter, onUpdateCharacter));

  // Nothing picked yet: the weapon in hand, two-handed.
  expect(screen.getByText('Quarterstaff')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /1d8\+1d6\+3/ })).toBeInTheDocument();

  fireEvent.click(screen.getByText('True Strike'));
  fireEvent.click(screen.getByRole('button', { name: 'Dagger' }));
  expect(onUpdateCharacter).toHaveBeenCalledTimes(1);
  const next = onUpdateCharacter.mock.calls[0][0](baseCharacter);
  expect(next.spellWeapons).toEqual({ 'True Strike': spellWeaponKey(dagger) });

  rerender(view(next, onUpdateCharacter));
  expect(screen.getByRole('button', { name: /1d4\+1d6\+3/ })).toBeInTheDocument();
});
