import { render, screen, within } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import BookLinks from '../../../../src/pages/compendium/BookLinks.jsx';

const mocks = vi.hoisted(() => ({ loadBookList: vi.fn() }));

vi.mock('../../../../src/pages/compendium/books.js', () => ({ loadBookList: mocks.loadBookList }));

beforeEach(() => {
  mocks.loadBookList.mockResolvedValue([
    { id: 'XPHB', name: "Player's Handbook (2024)", kind: 'book', url: 'https://5e.tools/book.html#xphb' },
    { id: 'AUD', name: 'Arcana Unleashed: Deadfall', kind: 'adventure', url: 'https://5e.tools/adventure.html#aud' },
  ]);
});

test('each book opens its 5etools page in a new tab', async () => {
  render(<BookLinks />);
  const manuals = await screen.findByRole('list', { name: 'Manuals' });
  const link = within(manuals).getByRole('link', { name: /Player's Handbook \(2024\)/ });
  expect(link).toHaveAttribute('href', 'https://5e.tools/book.html#xphb');
  expect(link).toHaveAttribute('target', '_blank');
  expect(within(screen.getByRole('list', { name: 'Adventures' })).getByRole('link', { name: /Deadfall/ }))
    .toHaveAttribute('href', 'https://5e.tools/adventure.html#aud');
});
