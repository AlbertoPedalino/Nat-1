import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import BooksPanel from '../../../../../src/pages/charbuilder/progression/BooksPanel.jsx';

// The Dungeons & Dragons books and the Universes Beyond ones (World of
// Warcraft) are two groups; each book still toggles the same `books` field.
function group(title) {
  return screen.getByText(title).parentElement;
}

test('World of Warcraft is under Universes Beyond, apart from the D&D books', () => {
  const dispatch = vi.fn();
  render(<BooksPanel character={{ books: ['EFA', 'WoW'] }} dispatch={dispatch} />);

  expect(within(group('Universes Beyond')).getByRole('button', { name: 'World of Warcraft' })).toBeTruthy();
  expect(within(group('Dungeons & Dragons')).queryByRole('button', { name: 'World of Warcraft' })).toBeNull();
  expect(within(group('Dungeons & Dragons')).getByRole('button', { name: 'Eberron: Forge of the Artificer' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'World of Warcraft' }));
  expect(dispatch).toHaveBeenCalledWith({ type: 'field/set', field: 'books', value: ['EFA'] });
});
