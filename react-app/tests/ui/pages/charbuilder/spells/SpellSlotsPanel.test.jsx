import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it } from 'vitest';
import SpellSlotsPanel from '../../../../../src/pages/charbuilder/spells/SpellSlotsPanel.jsx';
import { theme } from '../../../../../src/app/theme.js';

// Artificer 4 + Wizard 1, without an explicit classLevel so the primary level is derived.
const character = (activeClassTab) => ({
  className: 'Artificer', level: 5, activeClassTab,
  extraClasses: [{ name: 'Wizard', level: 1 }],
});
const view = (C) => render(<ThemeProvider theme={theme}><SpellSlotsPanel character={C} /></ThemeProvider>);

describe('SpellSlotsPanel', () => {
  it('shows only the primary class slots on the first tab', () => {
    view(character(0));
    expect(screen.getByText('Spell Slots — Artificer')).toBeTruthy();
    expect(screen.getByText('1st: 3')).toBeTruthy();
    expect(screen.getByText('2nd: -')).toBeTruthy();
  });

  it('shows only the multiclass slots on its own tab', () => {
    view(character(1));
    expect(screen.getByText('Spell Slots — Wizard')).toBeTruthy();
    expect(screen.getByText('1st: 2')).toBeTruthy();
    expect(screen.getByText('2nd: -')).toBeTruthy();
  });
});
