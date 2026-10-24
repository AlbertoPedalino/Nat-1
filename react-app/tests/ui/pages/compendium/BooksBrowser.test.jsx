import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import BooksBrowser from '../../../../src/pages/compendium/BooksBrowser.jsx';
import { bookChapters } from '../../../../src/pages/compendium/books.js';

const mocks = vi.hoisted(() => ({ loadBookList: vi.fn(), loadBook: vi.fn() }));

vi.mock('../../../../src/pages/compendium/books.js', async (importOriginal) => ({
  ...await importOriginal(),
  loadBookList: mocks.loadBookList,
  loadBook: mocks.loadBook,
}));

const ready = { status: 'ready', index: [], legendaryGroups: new Map(), failed: [] };
const chapters = bookChapters([
  { name: 'Chapter 1: Playing the Game', entries: ['Imagination is key.', { type: 'entries', name: 'Dice', entries: ['Roll a d20 for tests.'] }] },
  { name: 'Chapter 2: Creating a Character', entries: ['Pick a class.'] },
]);

beforeEach(() => {
  mocks.loadBookList.mockResolvedValue([
    { id: 'XPHB', name: "Player's Handbook (2024)", kind: 'book', file: 'book/book-xphb.json' },
    { id: 'AUD', name: 'Arcana Unleashed: Deadfall', kind: 'adventure', file: 'adventure/adventure-aud.json' },
  ]);
  mocks.loadBook.mockResolvedValue(chapters);
});

test('a book opens on its first chapter; the contents and Next move through it', async () => {
  render(<BooksBrowser compendium={ready} />);
  expect(await screen.findByRole('list', { name: 'Adventures' })).toBeInTheDocument();
  fireEvent.click(screen.getByText("Player's Handbook (2024)"));

  expect(await screen.findByRole('heading', { name: 'Chapter 1: Playing the Game' })).toBeInTheDocument();
  expect(mocks.loadBook).toHaveBeenCalledWith(expect.objectContaining({ id: 'XPHB' }), { lookup: null });
  const contents = screen.getByRole('list', { name: 'Contents' });
  expect(within(contents).getByText('Dice')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: 'Chapter 2: Creating a Character' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Books' }));
  expect(await screen.findByRole('list', { name: 'Manuals' })).toBeInTheDocument();
});

test('a search lists where the words are and opens the text there, marked', async () => {
  const { container } = render(<BooksBrowser compendium={ready} />);
  fireEvent.click(await screen.findByText("Player's Handbook (2024)"));
  await screen.findByRole('heading', { name: 'Chapter 1: Playing the Game' });

  fireEvent.change(screen.getByRole('textbox', { name: 'Search this book' }), { target: { value: 'd20' } });
  const found = await screen.findByRole('list', { name: 'Found in the book' });
  const hit = within(found).getByText('Roll a d20 for tests.');
  expect(within(found).getByText('Chapter 1: Playing the Game › Dice')).toBeInTheDocument();
  fireEvent.click(hit);
  await waitFor(() => expect(container.querySelector('[data-book-hit]')).toHaveTextContent('Roll a d20 for tests.'));
});

test('the book waits for the compendium its references come from', async () => {
  const { rerender } = render(<BooksBrowser compendium={{ ...ready, status: 'loading' }} />);
  fireEvent.click(await screen.findByText("Player's Handbook (2024)"));
  expect(screen.getByText('Opening the book…')).toBeInTheDocument();
  expect(mocks.loadBook).not.toHaveBeenCalled();
  rerender(<BooksBrowser compendium={ready} />);
  expect(await screen.findByRole('heading', { name: 'Chapter 1: Playing the Game' })).toBeInTheDocument();
});

test('a name in the text opens its compendium entry over the page', async () => {
  const { buildCompendiumIndex } = await import('../../../../src/pages/compendium/compendiumIndex.js');
  const index = buildCompendiumIndex({
    spell: [{ name: 'Fireball', source: 'XPHB', level: 3, schoolFull: 'Evocation', descriptionEntries: ['A bright streak flashes.'] }],
  });
  mocks.loadBookList.mockResolvedValue([{ id: 'XDMG', name: "Dungeon Master's Guide (2024)", kind: 'book', file: 'book/book-xdmg.json' }]);
  mocks.loadBook.mockResolvedValue(bookChapters([
    { name: 'Chapter 1', entries: ['The wizard casts {@spell Fireball|XPHB} at {@creature Nobody Known|XMM}.'] },
  ]));
  render(<BooksBrowser compendium={{ ...ready, index }} />);
  fireEvent.click(await screen.findByText("Dungeon Master's Guide (2024)"));
  await screen.findByRole('heading', { name: 'Chapter 1' });

  expect(screen.queryByRole('button', { name: 'Nobody Known' })).not.toBeInTheDocument();
  expect(screen.getByText('Nobody Known')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fireball' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: 'Fireball' })).toBeInTheDocument();
  expect(within(dialog).getByText('A bright streak flashes.')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
