import React from 'react';
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DmScreenProvider } from '../state/DmScreenContext.jsx';
import NoteBoard from './NoteBoard.jsx';

// An unsaved instance keeps the whole board in memory: these tests exercise the
// wiring between the search field, the filter, and the cards, not persistence.
function renderBoard() {
  render(
    <DmScreenProvider instanceId="test-screen" instanceSaved={false}>
      <NoteBoard />
    </DmScreenProvider>,
  );
  return userEvent.setup();
}

async function addNote(user, title, body) {
  const add = screen.queryByRole('button', { name: 'Add first note' })
    ?? screen.getByRole('button', { name: 'Add note' });
  await user.click(add);
  // A new note is appended, so it owns the last set of fields on the board.
  const titles = screen.getAllByLabelText('Title (optional)');
  await user.type(titles[titles.length - 1], title);
  const bodies = screen.getAllByLabelText('Note (markdown)');
  await user.type(bodies[bodies.length - 1], body);
}

const search = () => screen.getByRole('textbox', { name: 'Search notes' });
const cards = () => screen.queryAllByRole('article');

describe('NoteBoard', () => {
  test('offers no search until there is something to search', async () => {
    const user = renderBoard();
    expect(screen.queryByRole('textbox', { name: 'Search notes' })).toBeNull();

    await addNote(user, 'Tavern', 'Garret the barkeep');
    expect(search()).toBeInTheDocument();
    expect(cards()).toHaveLength(1);
  });

  test('filtering hides the notes that do not match, and clearing brings them back', async () => {
    const user = renderBoard();
    await addNote(user, 'Tavern', 'Garret the barkeep');
    await addNote(user, 'House rules', 'Crits deal max damage');
    expect(cards()).toHaveLength(2);

    // A body word finds its note even though the title says nothing about it.
    await user.type(search(), 'barkeep');
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('Garret', { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(cards()).toHaveLength(2);
  });

  test('reports how much of the board is left', async () => {
    const user = renderBoard();
    await addNote(user, 'Tavern', 'Garret the barkeep');
    await addNote(user, 'House rules', 'Crits deal max damage');

    await user.type(search(), 'crits');
    expect(screen.getByText('1 of 2 notes')).toBeInTheDocument();

    // Everything matches: nothing is hidden, so there is no count to report.
    await user.clear(search());
    await user.type(search(), 'e');
    expect(screen.queryByText(/of 2 notes/)).toBeNull();
  });

  test('a search that matches nothing offers a way out', async () => {
    const user = renderBoard();
    await addNote(user, 'Tavern', 'Garret the barkeep');

    await user.type(search(), 'lich');
    expect(cards()).toHaveLength(0);
    expect(screen.getByText('No notes match that search')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all notes' }));
    expect(cards()).toHaveLength(1);
  });

  test('withholds reordering while the view is partial', async () => {
    const user = renderBoard();
    await addNote(user, 'Tavern', 'Garret the barkeep');
    await addNote(user, 'House rules', 'Crits deal max damage');
    expect(screen.getAllByRole('button', { name: /^Reorder note/ })).toHaveLength(2);

    // With a note hidden, a position on screen is no longer the position in the
    // list, so the handles go away instead of writing a wrong order.
    await user.type(search(), 'crits');
    expect(screen.queryAllByRole('button', { name: /^Reorder note/ })).toHaveLength(0);

    await user.clear(search());
    expect(screen.getAllByRole('button', { name: /^Reorder note/ })).toHaveLength(2);
  });

  test('Escape clears the search from the keyboard', async () => {
    const user = renderBoard();
    await addNote(user, 'Tavern', 'Garret the barkeep');

    await user.type(search(), 'lich');
    expect(cards()).toHaveLength(0);

    await user.type(search(), '{Escape}');
    expect(search()).toHaveValue('');
    expect(cards()).toHaveLength(1);
  });

  test('marks the search hit in the rendered note', async () => {
    const user = renderBoard();
    await addNote(user, 'Tavern', '**Garret** the barkeep');

    await user.type(search(), 'garret');
    const marks = [...document.querySelectorAll('mark')];
    expect(marks.map((mark) => mark.textContent)).toEqual(['Garret']);
    // Found in the rendered text: the bold run is still bold around it.
    expect(marks[0].closest('strong')).not.toBeNull();
  });
});
