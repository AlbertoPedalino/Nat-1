import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PrimalCompanionPanel from '../../../../../src/pages/charsheet/forms/PrimalCompanionPanel.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';

const beast = (name, extra) => ({
  name,
  source: 'XPHB',
  summonedByClass: 'Ranger|XPHB',
  size: ['M'],
  type: 'beast',
  ac: [{ special: '13 plus your Wisdom modifier' }],
  hp: { special: '5 plus five times your Ranger level (the beast has a number of Hit Dice [d8s] equal to your Ranger level)' },
  str: 14, dex: 14, con: 15, int: 8, wis: 14, cha: 11,
  ...extra,
});

vi.mock('../../../../../src/pages/charsheet/forms/useSummonedCreatureRecords.js', () => ({
  useSummonedCreatureRecords: () => ({
    status: 'ready',
    records: [
      beast('Beast of the Land', {
        action: [{ name: "Beast's Strike", entries: ['{@damage 1d8 + 2} plus your Wisdom modifier Bludgeoning, Piercing, or Slashing damage (your choice when you summon the beast).'] }],
      }),
      beast('Beast of the Sky', {
        hp: { special: '4 plus four times your Ranger level (the beast has a number of Hit Dice [d6s] equal to your Ranger level)' },
        action: [{ name: "Beast's Strike", entries: ['{@damage 1d4 + 3} plus your Wisdom modifier Slashing damage.'] }],
      }),
    ],
  }),
}));

// The class's spellcasting data is loaded at runtime; a level 5 Ranger has
// four 1st- and two 2nd-level slots.
vi.mock('../../../../../src/shared/character/spells/spellcasting.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getSpellSlots: () => ({ regular: [4, 2], pact: null }),
}));

// Ranger 5, WIS 16: PB +3, WIS +3.
const ranger = (primalCompanion) => ({
  className: 'Ranger',
  level: 5,
  scoreMethod: 'manual',
  manualScores: { str: 10, dex: 14, con: 12, int: 10, wis: 16, cha: 8 },
  choices: { subclass_beast_companion_type: ['Beast of the Land'] },
  ...(primalCompanion ? { primalCompanion } : {}),
});

function renderPanel(character, actions = {}) {
  const onUpdateCharacter = vi.fn();
  const onUpdateSheet = vi.fn();
  render(
    <SheetActionsProvider value={{ onUpdateCharacter, onUpdateSheet, onShowToast: vi.fn(), ...actions }}>
      <PrimalCompanionPanel character={character} sheet={{ spellSlotUsed: {} }} />
    </SheetActionsProvider>,
  );
  // The patch the panel saved, applied to the character it was given.
  const saved = () => onUpdateCharacter.mock.calls.map(([update]) => update(character));
  return { onUpdateCharacter, onUpdateSheet, saved };
}

test('shows the builder beast at full HP, scaled to the Ranger', () => {
  renderPanel(ranger());
  expect(screen.getByText('Beast of the Land')).toBeInTheDocument();
  // 5 + 5 × 5 HP with 5d8 Hit Dice; the readout shows 30 / 30.
  expect(screen.getByRole('button', { name: '5d8' })).toBeInTheDocument();
  expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByRole('button', { name: '1d8+5' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bludgeoning' })).toHaveAttribute('aria-pressed', 'true');
});

test('choosing another beast summons it at full HP and updates the builder choice; the damage type is saved', () => {
  const { saved, onUpdateCharacter } = renderPanel(ranger());
  fireEvent.click(screen.getByRole('button', { name: 'Sky' }));
  expect(saved()[0].primalCompanion).toEqual({ beast: 'Beast of the Sky', damageType: 'Slashing', hpCurrent: null });
  // The builder reads the same choice.
  expect(saved()[0].choices.subclass_beast_companion_type).toEqual(['Beast of the Sky']);

  onUpdateCharacter.mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Piercing' }));
  expect(saved()[0].primalCompanion).toMatchObject({ beast: 'Beast of the Land', damageType: 'Piercing' });
});

test('a dead beast is revived with the lowest spell slot', () => {
  const { saved, onUpdateSheet } = renderPanel(ranger({ beast: 'Beast of the Land', damageType: 'Slashing', hpCurrent: 0 }));
  fireEvent.click(screen.getByRole('button', { name: 'Revive (level 1 slot)' }));
  expect(onUpdateSheet).toHaveBeenCalledWith({ spellSlotUsed: { 1: 1 } });
  expect(saved().at(-1).primalCompanion.hpCurrent).toBeNull();
});
