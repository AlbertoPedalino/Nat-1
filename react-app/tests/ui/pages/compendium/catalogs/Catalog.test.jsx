import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { buildCompendiumIndex } from '../../../../../src/pages/compendium/search/compendiumIndex.js';
import Catalog from '../../../../../src/pages/compendium/catalogs/Catalog.jsx';
import { CATALOG_TABS } from '../../../../../src/pages/compendium/catalogs/catalogColumns.jsx';

const tab = (key) => CATALOG_TABS.find((entry) => entry.key === key);
const renderCatalog = (key) => render(<Catalog compendium={compendium} definition={tab(key).definition} columns={tab(key).columns} />);

const index = buildCompendiumIndex({
  item: [
    { name: 'Rope', source: 'XPHB', type: 'G', rarity: 'none', value: 100, weight: 5, entries: ['Hempen rope.'] },
    { name: 'Longsword', source: 'XPHB', type: 'M', rarity: 'none', value: 1500, weight: 3, dmg1: '1d8', dmgType: 'S' },
    { name: 'Bag of Holding', source: 'XDMG', type: 'G', wondrous: true, rarity: 'uncommon', entries: ['A bag of holding.'] },
    { name: 'Wand of Fireballs', source: 'XDMG', type: 'WD', rarity: 'rare', reqAttune: 'by a spellcaster', charges: 7, entries: ['A wand.'] },
  ],
});
index.find((entry) => entry.name === 'Bag of Holding').image = 'https://img.test/items/XDMG/Bag%20of%20Holding.webp';
const compendium = { status: 'ready', index, legendaryGroups: new Map(), failed: [] };

// react-window measures its box; jsdom has no ResizeObserver.
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

test('magic items list with rarity, type and attunement, and open their entry', () => {
  renderCatalog('magic');
  expect(screen.getByText('2 magic items')).toBeInTheDocument();
  const wand = screen.getByRole('button', { name: /Wand of Fireballs/ });
  expect(wand).toHaveTextContent('Rare');
  expect(wand).toHaveTextContent('Wand');
  expect(wand).toHaveTextContent('Requires attunement by a spellcaster');
  expect(wand).toHaveTextContent('7 charges');
  expect(screen.queryByRole('button', { name: /Rope/ })).not.toBeInTheDocument();
  expect(wand.querySelector('img')).toBeNull();

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search magic items' }), { target: { value: 'bag' } });
  expect(screen.getByText('1 magic items')).toBeInTheDocument();
  const bag = screen.getByRole('button', { name: /Bag of Holding/ });
  expect(bag.querySelector('img')).toHaveAttribute('src', 'https://img.test/items/XDMG/Bag%20of%20Holding.webp');
  fireEvent.click(bag);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('A bag of holding.')).toBeInTheDocument();
  expect(within(dialog).getByRole('img', { name: 'Bag of Holding' })).toBeInTheDocument();
});

test('equipment lists value, weight and attributes, and filters by typed ranges', () => {
  renderCatalog('equipment');
  expect(screen.getByText('2 items')).toBeInTheDocument();
  const sword = screen.getByRole('button', { name: /Longsword/ });
  expect(sword).toHaveTextContent('15 gp');
  expect(sword).toHaveTextContent('3 lb');
  expect(sword).toHaveTextContent('1d8 slashing');
  expect(sword).toHaveTextContent('Weapons');

  fireEvent.change(screen.getByRole('textbox', { name: 'Weight minimum' }), { target: { value: '4' } });
  expect(screen.getByText('1 items')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Rope/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByText('2 items')).toBeInTheDocument();
});
