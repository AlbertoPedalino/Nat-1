import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import ClassPanel from '../../../../../src/pages/charbuilder/progression/ClassPanel.jsx';

const fighter = { name: 'Fighter', source: 'XPHB' };
const wizard = { name: 'Wizard', source: 'XPHB' };
const rogue = { name: 'Rogue', source: 'XPHB' };

function setup(overrides = {}) {
  const character = {
    className: fighter.name,
    classSource: fighter.source,
    classLevel: 1,
    level: 2,
    activeClassTab: 0,
    extraClasses: [{ name: rogue.name, source: rogue.source, level: 1 }],
    scoreMethod: 'manual',
    manualScores: { str: 16, dex: 16, con: 16, int: 16, wis: 16, cha: 16 },
    choices: {},
    ...overrides,
  };
  const dispatch = vi.fn();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(<ClassPanel state={{ data: { classes: [fighter, wizard, rogue] }, search: {} }} character={character} dispatch={dispatch} />);
  return { dispatch, confirm };
}

test.each([0, 1])('changing the class in tab %i requires confirmation and supports cancellation', (activeClassTab) => {
  const { dispatch, confirm } = setup({ activeClassTab });
  fireEvent.click(screen.getByText('Wizard'));
  const dialog = screen.getByRole('dialog', { name: 'Change class?' });
  expect(dialog).toHaveTextContent(activeClassTab ? 'Rogue (XPHB)' : 'Fighter (XPHB)');
  expect(dialog).toHaveTextContent('Wizard (XPHB)');
  expect(confirm).not.toHaveBeenCalled();
  expect(dispatch).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(dispatch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Wizard'));
  fireEvent.click(screen.getByRole('button', { name: 'Change class' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(dispatch).toHaveBeenCalledOnce();
  expect(dispatch).toHaveBeenCalledWith({
    type: activeClassTab ? 'extra-class/select' : 'class/select',
    ...(activeClassTab ? { index: 0 } : {}),
    className: wizard.name,
    source: wizard.source,
    classObject: wizard,
  });
});

test.each([0, 1])('selecting the first class in empty tab %i needs no confirmation', (activeClassTab) => {
  const { dispatch, confirm } = setup(activeClassTab
    ? { activeClassTab, extraClasses: [{ name: '', source: '', level: 1 }] }
    : { className: '', classSource: '', extraClasses: [] });
  fireEvent.click(screen.getByText('Wizard'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(confirm).not.toHaveBeenCalled();
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
    type: activeClassTab ? 'extra-class/select' : 'class/select', className: 'Wizard',
  }));
});

test.each([0, 1])('clicking the already selected class in tab %i keeps its choices', (activeClassTab) => {
  const { dispatch, confirm } = setup({ activeClassTab });
  fireEvent.click(screen.getByText(activeClassTab ? 'Rogue' : 'Fighter'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(confirm).not.toHaveBeenCalled();
  expect(dispatch).not.toHaveBeenCalled();
});

test('adding a multiclass and switching tabs need no confirmation', () => {
  const { dispatch, confirm } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Multiclass' }));
  expect(dispatch).toHaveBeenCalledWith({ type: 'multiclass/add' });
  fireEvent.click(screen.getByRole('button', { name: 'Rogue Lv 1' }));
  expect(dispatch).toHaveBeenCalledWith({ type: 'class-tab/set', tab: 1 });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(confirm).not.toHaveBeenCalled();
});

test('Escape dismisses the confirmation panel without replacing the class', () => {
  const { dispatch } = setup();
  fireEvent.click(screen.getByText('Wizard'));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(dispatch).not.toHaveBeenCalled();
});
