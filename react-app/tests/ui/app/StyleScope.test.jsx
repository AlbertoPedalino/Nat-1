import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';
import StyleScope from '../../../src/app/StyleScope.jsx';
import { ThemeChoiceProvider } from '../../../src/app/ThemeChoiceProvider.jsx';
import { usePaletteId, useStyleId, useStyleShapes } from '../../../src/shared/ui/themeIds.js';

function Reads() {
  const { moments } = useStyleShapes();
  return <output>{`${useStyleId()} ${usePaletteId()} ${moments.nat20.paint}`}</output>;
}

function renderIn(styleId) {
  return render(<ThemeChoiceProvider><StyleScope styleId={styleId}><Reads /></StyleScope></ThemeChoiceProvider>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('gb:theme', JSON.stringify({ mode: 'dark', style: 'comic' }));
});

// A roll bubble on the map is drawn in its roller's style: what is cut in
// code inside the scope (a roll's moment) reads that style and its palette
// for the viewer's mode.
test("draws its part of the page in another style, in that style's palette for the viewer's mode", () => {
  renderIn('gothic');
  expect(screen.getByRole('status')).toHaveTextContent('gothic dread engraving');
});

test("an unknown style, or none, is drawn in the viewer's own", () => {
  renderIn('plaid');
  expect(screen.getByRole('status')).toHaveTextContent('comic dark comic');
});
