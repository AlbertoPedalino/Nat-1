import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { AdapterActionCard } from '../../../../../src/pages/charsheet/actions/AdapterActionCard.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';

// A card's builder choice (the Death Knight's rune) is switched from the
// sheet, saved as the builder saves it: a one-item list under the prefix of
// the class that owns the card.
const runeforging = {
  name: 'Runeforging',
  cat: 'special',
  choiceKey: 'subclass_spell_list',
  choicePrefix: 'mc0_',
  choiceLabel: 'Rune',
  choiceOptions: () => ['Blood', 'Frost', 'Unholy'].map((name) => ({ value: name, label: name })),
};

function renderCard(character, onUpdateCharacter) {
  render(
    <SheetActionsProvider value={{ onUpdateCharacter }}>
      <AdapterActionCard C={character} action={runeforging} />
    </SheetActionsProvider>,
  );
  fireEvent.click(screen.getByText('Runeforging'));
}

test('the rune picked on the sheet is saved under its class prefix, as the builder saves it', () => {
  const onUpdateCharacter = vi.fn();
  const character = { choices: { mc0_subclass_spell_list: ['Blood'] } };
  renderCard(character, onUpdateCharacter);

  expect(screen.getByRole('button', { name: 'Blood', pressed: true })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Frost' }));
  const update = onUpdateCharacter.mock.calls[0][0];
  expect(update(character).choices).toEqual({ mc0_subclass_spell_list: ['Frost'] });
});
