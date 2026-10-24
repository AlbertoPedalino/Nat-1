import { fireEvent, render, screen, within } from '@testing-library/react';
import CompendiumBrowser from '../../../../src/pages/compendium/CompendiumBrowser.jsx';
import { buildCompendiumIndex } from '../../../../src/pages/compendium/compendiumIndex.js';

const index = buildCompendiumIndex({
  spell: [{
    name: 'Fireball', source: 'XPHB', level: 3, schoolFull: 'Evocation', castingTimeLabel: 'Action', rangeLabel: '150 feet',
    descriptionEntries: ['A bright streak flashes from you.'],
  }],
  condition: [{ name: 'Grappled', source: 'XPHB', entries: ['Your Speed is 0 and can’t increase.'] }],
  item: [{ name: 'Wand of Fireballs', source: 'XDMG', type: 'WD', rarity: 'rare', entries: ['This wand has 7 charges.'] }],
});
const compendium = { status: 'ready', index, legendaryGroups: new Map(), failed: [] };

test('search, filter by kind, and read an entry', () => {
  render(<CompendiumBrowser compendium={compendium} layout="page" />);
  const results = () => within(screen.getByRole('list', { name: 'Results' })).getAllByRole('button').map((row) => row.textContent);
  expect(results()).toHaveLength(3);

  fireEvent.change(screen.getByRole('textbox', { name: 'Search the compendium' }), { target: { value: 'fireball' } });
  expect(results()[0]).toMatch(/^Fireball/);
  expect(results()[1]).toMatch(/^Wand of Fireballs/);

  fireEvent.click(screen.getByRole('button', { name: 'Items' }));
  expect(results()).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Items' }));
  expect(results()).toHaveLength(2);

  fireEvent.click(screen.getByText('Fireball'));
  expect(screen.getByRole('heading', { name: 'Fireball' })).toBeInTheDocument();
  expect(screen.getByText('A bright streak flashes from you.')).toBeInTheDocument();
  expect(screen.getByText('150 feet')).toBeInTheDocument();
});

test('the panel shows the entry in place of the results, with a way back', () => {
  render(<CompendiumBrowser compendium={compendium} layout="panel" />);
  fireEvent.click(screen.getByText('Grappled'));
  expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  expect(screen.getByText(/Your Speed is 0/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
  expect(screen.getByRole('list', { name: 'Results' })).toBeInTheDocument();
});

test('loading, failure and partial loads say so', () => {
  const { rerender } = render(<CompendiumBrowser compendium={{ ...compendium, status: 'loading', index: [] }} />);
  expect(screen.getByText('Loading the books…')).toBeInTheDocument();
  rerender(<CompendiumBrowser compendium={{ ...compendium, status: 'error', index: [] }} />);
  expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  rerender(<CompendiumBrowser compendium={{ ...compendium, failed: ['monster'] }} />);
  expect(screen.getByText('Not loaded: Monsters.')).toBeInTheDocument();
});
