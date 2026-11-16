import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// The account button needs the auth and toast providers; this suite is about the
// compendium and the settings beside it.
vi.mock('../../../../src/shared/cloud/auth/CloudMenu.jsx', () => ({ default: () => null }));

function openTheme() {
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Theme' }));
  return screen.getByRole('dialog', { name: 'Theme' });
}

const { default: AppTopBar } = await import('../../../../src/app/navigation/AppTopBar.jsx');
const { ThemeChoiceProvider } = await import('../../../../src/app/ThemeChoiceProvider.jsx');

function renderBar(props) {
  return render(<ThemeChoiceProvider><MemoryRouter><AppTopBar home {...props} /></MemoryRouter></ThemeChoiceProvider>);
}

describe('AppTopBar', () => {
  beforeEach(() => localStorage.clear());

  test('offers the compendium on every page by default', () => {
    renderBar();
    expect(screen.getByRole('button', { name: 'Compendium' })).toBeInTheDocument();
  });

  test('opens the theme panel from the settings menu, signed in or not', () => {
    renderBar();
    const panel = openTheme();
    expect(within(panel).getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByRole('radio', { name: 'Comic fantasy' })).toHaveAttribute('aria-checked', 'true');
  });

  test('the panel keeps the mode and the style chosen there, and draws the style in its palette', () => {
    renderBar();
    const panel = openTheme();
    fireEvent.click(within(panel).getByRole('button', { name: 'Light' }));
    expect(JSON.parse(localStorage.getItem('gb:theme'))).toEqual({ mode: 'light', style: 'comic', diceStyle: 'style', diceColors: 'style' });
    expect(document.documentElement.dataset.palette).toBe('light');
    fireEvent.click(within(panel).getByRole('radio', { name: 'Sci-fi' }));
    expect(JSON.parse(localStorage.getItem('gb:theme'))).toEqual({ mode: 'light', style: 'scifi', diceStyle: 'style', diceColors: 'style' });
    expect(document.documentElement.dataset.palette).toBe('neonLight');
    expect(document.documentElement.dataset.style).toBe('scifi');
  });

  test('leaves the compendium out on the compendium page itself', () => {
    renderBar({ compendium: false });
    expect(screen.queryByRole('button', { name: 'Compendium' })).not.toBeInTheDocument();
  });
});
