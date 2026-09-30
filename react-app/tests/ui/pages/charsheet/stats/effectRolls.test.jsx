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
