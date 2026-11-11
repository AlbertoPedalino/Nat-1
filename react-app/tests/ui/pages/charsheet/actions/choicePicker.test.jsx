import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { AdapterActionCard } from '../../../../../src/pages/charsheet/actions/AdapterActionCard.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';

// A card's builder choice (an Armorer's armor model) is switched from the
// sheet, saved as the builder saves it: a one-item list under the prefix of
// the class that owns the card.
const arcaneArmor = {
  name: 'Arcane Armor',
  cat: 'action',
  choiceKey: 'armorer_model',
  choicePrefix: 'mc0_',
  choiceLabel: 'Arcane Armor Model',
  choiceOptions: ['Guardian', 'Infiltrator', 'Dreadnaught'].map((name) => ({ value: name, label: name })),
};

function renderCard(character, onUpdateCharacter) {
  render(
    <SheetActionsProvider value={{ onUpdateCharacter }}>
      <AdapterActionCard C={character} action={arcaneArmor} />
    </SheetActionsProvider>,
  );
  fireEvent.click(screen.getByText('Arcane Armor'));
}

test('the model picked on the sheet is saved under its class prefix, as the builder saves it', () => {
  const onUpdateCharacter = vi.fn();
  const character = { choices: { mc0_armorer_model: ['Guardian'] } };
  renderCard(character, onUpdateCharacter);

  expect(screen.getByRole('button', { name: 'Guardian', pressed: true })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Infiltrator' }));
  const update = onUpdateCharacter.mock.calls[0][0];
  expect(update(character).choices).toEqual({ mc0_armorer_model: ['Infiltrator'] });
});
