import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { expect, test, vi } from 'vitest';
import SpellEntry from '../../../../../src/pages/charsheet/spells/SpellEntry.jsx';
import { SheetActionsProvider } from '../../../../../src/pages/charsheet/state/SheetActionsContext.jsx';
import { ProficiencySetsProvider } from '../../../../../src/pages/charsheet/proficiency/ProficiencySetsContext.jsx';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import { theme } from '../../../../../src/app/theme.js';

const wizard = {
  className: 'Wizard',
  level: 5,
  scoreMethod: 'manual',
  manualScores: { str: 10, dex: 12, con: 12, int: 16, wis: 10, cha: 10 },
};
const rayOfFrost = {
  name: 'Ray of Frost', source: 'XPHB', level: 3, spellAttack: ['R'], spellcastingAbility: 'int',
  entries: ['A frigid beam of blue-white light streaks toward a creature within range.'],
};

function view(entry) {
  return (
    <ThemeProvider theme={theme}>
      <SheetActionsProvider value={{ onUpdateCharacter: vi.fn(), onRoll: vi.fn(), onShowToast: vi.fn() }}>
        <ProficiencySetsProvider character={wizard}>
          <SpellEntry entry={entry} C={wizard} installedRegistry={adapterRegistry} />
        </ProficiencySetsProvider>
      </SheetActionsProvider>
    </ThemeProvider>
  );
}

// The wizard's own spell attack is +6 (PB 3, Int +3); read from a level 3
// scroll it is the scroll's +7.
test('a spell read from a scroll attacks with the scroll\'s bonus, not the reader\'s', () => {
  const { unmount } = render(view(rayOfFrost));
  expect(screen.getByRole('button', { name: /\+6/ })).toBeInTheDocument();
  unmount();
  render(view({ ...rayOfFrost, scroll: { level: 3, dc: 15, attack: 7 } }));
  expect(screen.getByRole('button', { name: /\+7/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /\+6/ })).toBeNull();
});
