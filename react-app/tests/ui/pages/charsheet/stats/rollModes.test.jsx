import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import SavingThrows from '../../../../../src/pages/charsheet/stats/SavingThrows.jsx';
import Skills from '../../../../../src/pages/charsheet/stats/Skills.jsx';
import RemindersBlock from '../../../../../src/pages/charsheet/stats/RemindersBlock.jsx';
import { ProficiencySetsProvider } from '../../../../../src/pages/charsheet/proficiency/ProficiencySetsContext.jsx';

// Advantage and disadvantage are chosen on the roll itself (right-click / long
// press on any d20 roller) on top of what conditions and features give. A
// reminder is only a name on the sheet: it never changes a roll.

const C = {
  name: 'Fighter', className: 'Fighter', level: 5,
  finalScores: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
  inventory: [],
};
const sheetWith = (patch) => ({ sheetInventory: [], activeConditions: [], activeEffects: [], exhaustionLevel: 0, ...patch });
const REMINDERS = [{ key: 'custom', text: 'Guidance' }, { key: 'custom', text: 'Bless' }];

function renderWithSets(ui) {
  return render(<ProficiencySetsProvider character={C}>{ui}</ProficiencySetsProvider>);
}

test('reminders leave saving throws and skills as straight rolls', () => {
  const onRoll = vi.fn();
  const { unmount } = renderWithSets(<SavingThrows C={C} sheet={sheetWith({ activeEffects: REMINDERS })} onRoll={onRoll} />);
  fireEvent.click(screen.getByText('WIS'));
  expect(onRoll).toHaveBeenLastCalledWith('wis', { advantage: undefined, disadvantage: undefined });
  unmount();

  renderWithSets(<Skills C={C} sheet={sheetWith({ activeEffects: REMINDERS })} onRoll={onRoll} />);
  fireEvent.click(screen.getByText('Athletics'));
  expect(onRoll).toHaveBeenLastCalledWith('Athletics', expect.any(Number), {});
});

test('a condition still drives the roll with reminders present', () => {
  const onRoll = vi.fn();
  renderWithSets(<SavingThrows C={C} sheet={sheetWith({
    activeConditions: ['restrained'], activeEffects: REMINDERS,
  })} onRoll={onRoll} />);
  fireEvent.click(screen.getByText('DEX'));
  expect(onRoll).toHaveBeenLastCalledWith('dex', { advantage: undefined, disadvantage: true });
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

test('the sheet lists its reminders by name, adds one and removes one', () => {
  const actions = { add: vi.fn(), remove: vi.fn() };
  render(<RemindersBlock sheet={sheetWith({ activeEffects: REMINDERS })} actions={actions} />);
  expect(screen.getByText('Guidance')).toBeInTheDocument();
  expect(screen.getByText('Bless')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Remove Bless'));
  expect(actions.remove).toHaveBeenCalledWith('Bless');

  const field = screen.getByLabelText('Reminder');
  fireEvent.change(field, { target: { value: 'Bardic Inspiration' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(actions.add).toHaveBeenCalledWith('Bardic Inspiration');
});

test('a read-only sheet shows its reminders without the controls', () => {
  const actions = { add: vi.fn(), remove: vi.fn(), readOnly: true };
  render(<RemindersBlock sheet={sheetWith({ activeEffects: REMINDERS })} actions={actions} />);
  expect(screen.getByText('Guidance')).toBeInTheDocument();
  expect(screen.queryByLabelText('Remove Guidance')).toBeNull();
  expect(screen.queryByLabelText('Reminder')).toBeNull();
});
