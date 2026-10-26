import { render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { buildCompendiumIndex } from '../../../../src/pages/compendium/compendiumIndex.js';
import { MonsterCatalog, SpellCatalog } from '../../../../src/pages/compendium/SpellMonsterCatalogs.jsx';

const index = buildCompendiumIndex({
  spell: [{ name: 'Fireball', source: 'XPHB', level: 3, schoolFull: 'Evocation', castingTimeLabel: '1 action', rangeLabel: '150 feet', durationLabel: 'Instantaneous' }],
  monster: [{ name: 'Goblin Warrior', source: 'XMM', cr: '1/4', type: 'fey', size: ['S'], ac: [15], hp: { average: 10 } }],
});
index.find((entry) => entry.kind === 'monster').image = 'https://img.test/tokens/Goblin%20Warrior.webp';
const compendium = { status: 'ready', index, legendaryGroups: new Map(), failed: [] };

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

test('spells list level, casting time, range and duration', () => {
  render(<SpellCatalog compendium={compendium} />);
  const fireball = screen.getByRole('button', { name: /Fireball/ });
  ['3rd-level Evocation', '1 action', '150 feet', 'Instantaneous'].forEach((text) => expect(fireball).toHaveTextContent(text));
});

test('monsters list their token, challenge rating, size, AC and HP', () => {
  render(<MonsterCatalog compendium={compendium} />);
  const goblin = screen.getByRole('button', { name: /Goblin Warrior/ });
  expect(goblin.querySelector('img')).toHaveAttribute('src', 'https://img.test/tokens/Goblin%20Warrior.webp');
  ['1/4', 'Small', '15', '10'].forEach((text) => expect(goblin).toHaveTextContent(text));
});
