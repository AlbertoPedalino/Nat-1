import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// The account menu needs the auth and toast providers; this suite is about the
// compendium button beside it and the theme it is given as its extra items.
vi.mock('../../../../src/shared/cloud/auth/CloudMenu.jsx', async () => {
  const { MenuList } = await import('@mui/material');
  return {
    default: ({ extraItems = [] }) => (
      <MenuList data-testid="account-menu">
        {typeof extraItems === 'function' ? extraItems(() => {}) : extraItems}
      </MenuList>
    ),
  };
});

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

  test('opens the theme panel from the account menu, not from a button of its own', () => {
    renderBar();
    expect(screen.queryByRole('button', { name: 'Theme' })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('account-menu')).getByRole('menuitem', { name: 'Theme' }));
    const panel = screen.getByRole('dialog', { name: 'Theme' });
    expect(within(panel).getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByRole('radio', { name: 'Comic' })).toHaveAttribute('aria-checked', 'true');
  });

  test('the panel keeps the colours chosen there', () => {
    renderBar();
    fireEvent.click(within(screen.getByTestId('account-menu')).getByRole('menuitem', { name: 'Theme' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Theme' })).getByRole('button', { name: 'Light' }));
    expect(JSON.parse(localStorage.getItem('gb:theme'))).toEqual({ colors: 'light', style: 'comic' });
    expect(document.documentElement.dataset.palette).toBe('light');
  });

  test('leaves the compendium out on the compendium page itself', () => {
    renderBar({ compendium: false });
    expect(screen.queryByRole('button', { name: 'Compendium' })).not.toBeInTheDocument();
  });
});
