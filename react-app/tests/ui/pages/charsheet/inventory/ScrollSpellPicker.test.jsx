import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { expect, test, vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import ScrollSpellPicker from '../../../../../src/pages/charsheet/inventory/ScrollSpellPicker.jsx';

vi.mock('../../../../../src/pages/charbuilder/data/dataLoaders.js', () => ({
  // The loader's real shape: the catalog with its indexes, not a bare list.
  loadSpells: async () => ({
    spells: [
      { name: 'Fireball', source: 'XPHB', level: 3 },
      { name: 'Counterspell', source: 'XPHB', level: 3 },
      { name: 'Shatter', source: 'XPHB', level: 2 },
    ],
    spellVersions: [],
    classSpellIndex: {},
    failedFiles: [],
  }),
}));

const view = (item, onWrite) => (
  <ThemeProvider theme={theme}><ScrollSpellPicker item={item} onWrite={onWrite} /></ThemeProvider>
);

test('a scroll offers every spell of its level and writes the one picked', async () => {
  const onPick = vi.fn();
  render(view({ name: 'Spell Scroll (Level 3)', spellScrollLevel: 3 }, onPick));
  fireEvent.mouseDown(screen.getByPlaceholderText('Spell'));
  await waitFor(() => expect(screen.getByRole('option', { name: 'Counterspell' })).toBeInTheDocument());
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Counterspell', 'Fireball']);
  fireEvent.click(screen.getByRole('option', { name: 'Fireball' }));
  expect(onPick).toHaveBeenCalledWith({ scrollSpell: { name: 'Fireball', source: 'XPHB' } });
});

test('anything that is not a spell scroll has no spell to pick', () => {
  const { container } = render(view({ name: 'Rope' }, vi.fn()));
  expect(container).toBeEmptyDOMElement();
});

test('a scroll\'s DC and attack are typed by hand; blank shows and keeps the fixed ones', () => {
  const onStats = vi.fn();
  render(view({ name: 'Spell Scroll (Level 3)', spellScrollLevel: 3 }, onStats));
  const dc = screen.getByRole('textbox', { name: 'DC' });
  const attack = screen.getByRole('textbox', { name: 'Attack' });
  expect(dc).toHaveAttribute('placeholder', '15');
  expect(attack).toHaveAttribute('placeholder', '+7');
  fireEvent.change(dc, { target: { value: '16' } });
  fireEvent.blur(dc);
  fireEvent.change(attack, { target: { value: '+8' } });
  fireEvent.blur(attack);
  expect(onStats.mock.calls).toEqual([[{ scrollDc: 16 }], [{ scrollAttack: 8 }]]);
});

test('clearing a typed number brings the fixed one back', () => {
  const onStats = vi.fn();
  render(view({ name: 'Spell Scroll (Level 3)', spellScrollLevel: 3, scrollDc: 16 }, onStats));
  const dc = screen.getByRole('textbox', { name: 'DC' });
  expect(dc).toHaveValue('16');
  fireEvent.change(dc, { target: { value: '' } });
  fireEvent.blur(dc);
  expect(onStats).toHaveBeenCalledWith({ scrollDc: null });
});
