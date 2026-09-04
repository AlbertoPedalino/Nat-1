import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { BeastStatBlock } from './BeastStatBlock.jsx';
import SummonedCreaturePanel, { DivinePowerStatusButton } from './SummonedCreaturePanel.jsx';
import { SheetActionsProvider } from '../context/SheetActionsContext.jsx';

test('Divine Power uses an explicit Available/Used toggle', () => {
  const onToggle = vi.fn();
  const { rerender } = render(
    <DivinePowerStatusButton available onToggle={onToggle} />,
  );

  const available = screen.getByRole('button', { name: 'Mark Divine Power as used' });
  expect(available).toHaveTextContent('Available');
  expect(available).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(available);
  expect(onToggle).toHaveBeenCalledOnce();

  rerender(<DivinePowerStatusButton available={false} onToggle={onToggle} />);
  const used = screen.getByRole('button', { name: 'Restore Divine Power' });
  expect(used).toHaveTextContent('Used');
  expect(used).toHaveAttribute('aria-pressed', 'true');
});

test('the Divine Power status sits on its Bonus Actions statblock line', () => {
  const creature = {
    name: 'Vestige Companion',
    size: 'Medium',
    ac: 13,
    hp: { average: 20, formula: '' },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    bonusActions: [{ name: 'Divine Power (1/Day)', entries: ['The companion uses its divine gift.'] }],
  };

  render(
    <BeastStatBlock
      b={creature}
      bonusActionAccessory={(item) => (/^Divine Power\b/i.test(item.name)
        ? <DivinePowerStatusButton available />
        : null)}
    />,
  );

  const line = screen.getByRole('button', { name: 'Mark Divine Power as used' }).closest('p');
  expect(line).toHaveTextContent(/Divine Power \(1\/Day\).*Available.*divine gift/);
});

test('clicking the Vestige Companion damage formula sends a complete dice roll', async () => {
  const onShowToast = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      monster: [{
        name: 'Vestige Companion',
        source: 'AU',
        summonedByClass: 'Warlock|XPHB',
        size: ['S'],
        type: 'celestial',
        ac: [13],
        hp: { average: 20 },
        speed: { walk: 5, fly: 30 },
        str: 1,
        dex: 14,
        con: 10,
        int: 15,
        wis: 15,
        cha: 16,
        action: [{
          name: "Vestige's Strike",
          entries: ['{@atkr m,r} {@hitYourSpellAttack Bonus equals your spell attack modifier}, reach 5 ft. or range 60 ft. {@h}{@damage 1d6 + 3} plus your Charisma modifier Radiant damage.'],
        }],
        bonus: [{
          name: 'Divine Power (1/Day)',
          entries: [{
            type: 'entries',
            name: 'Healing Touch',
            entries: ['The target regains Hit Points equal to {@dice 2d8} plus your Charisma modifier.'],
          }],
        }],
      }],
    }),
  }));

  render(
    <SheetActionsProvider value={{ onShowToast }}>
      <SummonedCreaturePanel
        descriptor={{ name: 'Vestige Companion', source: 'AU', levelClass: 'Warlock', ability: 'cha' }}
        character={{ className: 'Warlock', level: 6 }}
        abilityMod={-1}
        spellAttackBonus={3}
        spellSaveDc={11}
      />
    </SheetActionsProvider>,
  );

  fireEvent.click(await screen.findByRole('button', { name: '1d6+2' }));

  expect(onShowToast).toHaveBeenCalledOnce();
  expect(onShowToast.mock.calls[0][0]).toBe('Vestige Companion — Damage');
  expect(onShowToast.mock.calls[0][1]).toBe('1d6+2');
  expect(onShowToast.mock.calls[0][3]).toHaveLength(1);
  expect(onShowToast.mock.calls[0][4]).toEqual({ bonus: 2 });

  onShowToast.mockClear();
  fireEvent.click(screen.getByRole('button', { name: '2d8-1' }));
  expect(onShowToast).toHaveBeenCalledOnce();
  expect(onShowToast.mock.calls[0][0]).toBe('Vestige Companion — Healing');
  expect(onShowToast.mock.calls[0][1]).toBe('2d8-1');
  expect(onShowToast.mock.calls[0][3]).toHaveLength(2);
  expect(onShowToast.mock.calls[0][4]).toEqual({ bonus: -1 });
  vi.unstubAllGlobals();
});
