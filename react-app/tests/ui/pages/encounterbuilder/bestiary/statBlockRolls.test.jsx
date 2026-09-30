import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { StatBlockPanel } from '../../../../../src/pages/encounterbuilder/bestiary/StatBlockDialog.jsx';

// A stat block opened for a combatant rolls its d20 tests the way its
// conditions and effects say, and takes a one-off source on right-click.

const builder = vi.hoisted(() => ({ current: null }));
vi.mock('../../../../../src/pages/encounterbuilder/state/EncounterBuilderContext.jsx', () => ({
  useEncounterBuilder: () => builder.current,
}));

const OGRE = {
  name: 'Ogre', source: 'XMM', size: ['L'], type: 'giant', ac: [11], hp: { average: 68, formula: '8d10+24' },
  speed: { walk: 40 }, str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7, cr: '2',
  save: { dex: '-1' },
  action: [{ name: 'Greatclub', entries: ['{@atk m} {@hit 6} to hit, reach 5 ft. {@h}13 ({@damage 2d8+4}) Bludgeoning damage.'] }],
};

function mount({ conditions = [], effects = [] } = {}) {
  const roll = vi.fn(() => ({ result: 10, mathStr: '1d20 (4) +6', type: 'Attack Roll' }));
  builder.current = {
    state: {
      view: 'combat',
      selectedStatblock: { monster: OGRE, combatantId: 3 },
      combat: { combatants: [{ id: 3, type: 'monster', activeConditions: conditions, activeEffects: effects }] },
    },
    dispatch: vi.fn(),
    monsterDb: { legendaryGroups: [] },
    roll,
  };
  render(<StatBlockPanel />);
  return roll;
}

test('a poisoned creature attacks at disadvantage, and says so on the roller', () => {
  const roll = mount({ conditions: ['poisoned'] });
  const attack = screen.getByRole('button', { name: '+6 DIS' });
  fireEvent.click(attack);
  expect(roll).toHaveBeenLastCalledWith('+6', 'Attack Roll', undefined, '', { advantage: false });
  // Damage is not a d20 test: untouched.
  fireEvent.click(screen.getByRole('button', { name: '2d8+4' }));
  expect(roll).toHaveBeenLastCalledWith('2d8+4', 'Damage', undefined, '', { advantage: undefined });
});

test('right-click adds one source: poisoned plus a one-off advantage is a straight roll', () => {
  const roll = mount({ conditions: ['poisoned'] });
  fireEvent.contextMenu(screen.getByRole('button', { name: '+6 DIS' }));
  fireEvent.click(screen.getByRole('menuitem', { name: /\+ Advantage/ }));
  expect(roll).toHaveBeenCalledTimes(1);
  expect(roll).toHaveBeenLastCalledWith('+6', 'Attack Roll', undefined, '', { advantage: undefined });
});

test('effects reach saves by kind; a restrained creature has DEX-save disadvantage', () => {
  const roll = mount({ conditions: ['restrained'], effects: [{ key: 'selfCheckAdv', duration: 'manual' }] });
  fireEvent.click(screen.getByRole('button', { name: /Dex -1 DIS/ }));
  expect(roll).toHaveBeenLastCalledWith('-1', 'Dex Save', undefined, '', { advantage: false });
  fireEvent.click(screen.getByRole('button', { name: /STR ADV/ }));
  expect(roll).toHaveBeenLastCalledWith('+4', 'STR Check', undefined, '', { advantage: true });
});
