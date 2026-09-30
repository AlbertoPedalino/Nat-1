import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import SavingThrows from '../../../../../src/pages/charsheet/stats/SavingThrows.jsx';
import Skills from '../../../../../src/pages/charsheet/stats/Skills.jsx';
import { ProficiencySetsProvider } from '../../../../../src/pages/charsheet/proficiency/ProficiencySetsContext.jsx';

// The sheet's dice honour the advantage/disadvantage effects the map, the
// encounter builder or the player set, and any advantage plus any disadvantage
// is a straight roll whatever the count.

const C = {
  name: 'Fighter', className: 'Fighter', level: 5,
  finalScores: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
  inventory: [],
};
const sheetWith = (patch) => ({ sheetInventory: [], activeConditions: [], activeEffects: [], exhaustionLevel: 0, ...patch });

function renderWithSets(ui) {
  return render(<ProficiencySetsProvider character={C}>{ui}</ProficiencySetsProvider>);
}

test('a saving-throw effect drives the roll, and it cancels against a condition', () => {
  const onRoll = vi.fn();
  renderWithSets(<SavingThrows C={C} sheet={sheetWith({
    activeConditions: ['restrained'], activeEffects: [{ key: 'selfSaveAdv', duration: 'manual' }],
  })} onRoll={onRoll} />);
  fireEvent.click(screen.getByText('STR'));
  expect(onRoll).toHaveBeenLastCalledWith('str', { advantage: true, disadvantage: undefined });
  // Restrained: disadvantage on DEX saves, against the effect's advantage.
  fireEvent.click(screen.getByText('DEX'));
  expect(onRoll).toHaveBeenLastCalledWith('dex', { advantage: undefined, disadvantage: undefined });
});

test('a saving-throw disadvantage effect rolls every save at disadvantage', () => {
  const onRoll = vi.fn();
  renderWithSets(<SavingThrows C={C} sheet={sheetWith({
    activeEffects: [{ key: 'selfSaveDisadv', duration: 'next' }],
  })} onRoll={onRoll} />);
  fireEvent.click(screen.getByText('WIS'));
  expect(onRoll).toHaveBeenLastCalledWith('wis', { advantage: undefined, disadvantage: true });
});

test('an ability-check effect reaches every skill, and cancels against a condition', () => {
  const onRoll = vi.fn();
  const { unmount } = renderWithSets(<Skills C={C} sheet={sheetWith({
    activeEffects: [{ key: 'selfCheckAdv', duration: 'manual' }],
  })} onRoll={onRoll} />);
  fireEvent.click(screen.getByText('Athletics'));
  expect(onRoll).toHaveBeenLastCalledWith('Athletics', expect.any(Number), { advantage: true });
  unmount();

  renderWithSets(<Skills C={C} sheet={sheetWith({
    activeConditions: ['poisoned'], activeEffects: [{ key: 'selfCheckAdv', duration: 'manual' }],
  })} onRoll={onRoll} />);
  fireEvent.click(screen.getByText('Athletics'));
  expect(onRoll).toHaveBeenLastCalledWith('Athletics', expect.any(Number), {});
});

// Vow of Enmity while Blinded: the paladin right-clicks the attack against the
// vowed target and adds advantage, which cancels Blinded to a straight roll.
test('the attack button adds a one-off source on right-click, cancelling against Blinded', async () => {
  const { default: AttackRollButton } = await import('../../../../../src/pages/charsheet/actions/AttackRollButton.jsx');
  const { describeAttackRoll } = await import('../../../../../src/shared/character/combat/conditions.js');
  const roll = describeAttackRoll(['blinded']);
  const onRoll = vi.fn();
  render(<AttackRollButton rawBonus={5} label="Longsword" advArg={roll.advArg} sources={roll.sources} onRoll={onRoll} />);
  fireEvent.click(screen.getByRole('button', { name: /Hit/ }));
  expect(onRoll).toHaveBeenLastCalledWith(5, 'Longsword', false);
  fireEvent.contextMenu(screen.getByRole('button', { name: /Hit/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: /\+ Advantage/ }));
  expect(onRoll).toHaveBeenLastCalledWith(5, 'Longsword', undefined);
  expect(onRoll).toHaveBeenCalledTimes(2);
});

test('a saving throw takes the one-off source too', () => {
  const onRoll = vi.fn();
  renderWithSets(<SavingThrows C={C} sheet={sheetWith({})} onRoll={onRoll} />);
  fireEvent.contextMenu(screen.getByText('CON'));
  fireEvent.click(screen.getByRole('menuitem', { name: /\+ Disadvantage/ }));
  expect(onRoll).toHaveBeenCalledTimes(1);
  expect(onRoll).toHaveBeenLastCalledWith('con', { advantage: undefined, disadvantage: true });
});
