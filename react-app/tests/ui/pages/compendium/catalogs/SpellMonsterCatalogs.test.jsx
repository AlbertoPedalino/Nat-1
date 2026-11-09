import { render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { buildCompendiumIndex } from '../../../../../src/pages/compendium/search/compendiumIndex.js';
import Catalog from '../../../../../src/pages/compendium/catalogs/Catalog.jsx';
import { CATALOG_TABS } from '../../../../../src/pages/compendium/catalogs/catalogColumns.jsx';
import { getMonsterTokenUrls } from '../../../../../src/shared/bestiary/monsterUtils.js';

const tab = (key) => CATALOG_TABS.find((entry) => entry.key === key);
const renderCatalog = (key) => render(<Catalog compendium={compendium} definition={tab(key).definition} columns={tab(key).columns} />);

const index = buildCompendiumIndex({
  spell: [{ name: 'Fireball', source: 'XPHB', level: 3, schoolFull: 'Evocation', castingTimeLabel: '1 action', rangeLabel: '150 feet', durationLabel: 'Instantaneous' }],
  monster: [{ name: 'Goblin Warrior', source: 'XMM', cr: '1/4', type: 'fey', size: ['S'], ac: [15], hp: { average: 10 }, hasToken: true }],
});
const compendium = { status: 'ready', index, legendaryGroups: new Map(), failed: [] };

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

test('spells list level, casting time, range and duration', () => {
  renderCatalog('spells');
  const fireball = screen.getByRole('button', { name: /Fireball/ });
  ['3rd-level Evocation', '1 action', '150 feet', 'Instantaneous'].forEach((text) => expect(fireball).toHaveTextContent(text));
});

test('monsters list their token (as the bestiary draws it), challenge rating, size, AC and HP', () => {
  renderCatalog('monsters');
  const goblin = screen.getByRole('button', { name: /Goblin Warrior/ });
  const [token] = getMonsterTokenUrls(index.find((entry) => entry.kind === 'monster').record);
  expect(goblin.querySelector('img')).toHaveAttribute('src', token);
  ['1/4', 'Small', '15', '10'].forEach((text) => expect(goblin).toHaveTextContent(text));
});
