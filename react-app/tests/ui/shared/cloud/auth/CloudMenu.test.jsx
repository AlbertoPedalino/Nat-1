import { fireEvent, render, screen } from '@testing-library/react';
import { MenuItem } from '@mui/material';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const auth = vi.hoisted(() => ({ value: {} }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => auth.value }));
vi.mock('../../../../../src/shared/cloud/auth/AuthDialog.jsx', () => ({ default: () => null }));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: vi.fn() }) }));

const { default: CloudMenu } = await import('../../../../../src/shared/cloud/auth/CloudMenu.jsx');

const extraItems = [<MenuItem key="dark">Dark</MenuItem>];

describe('CloudMenu', () => {
  beforeEach(() => {
    auth.value = { cloudEnabled: true, status: 'anon', username: null, role: null, signOut: vi.fn() };
  });

  test('opens without the online features, for what the page adds', () => {
    auth.value = { ...auth.value, cloudEnabled: false };
    render(<CloudMenu extraItems={extraItems} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByRole('menuitem', { name: /online features not configured/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Dark' })).toBeInTheDocument();
  });

  test('keeps the added items after the account\'s, signed in or not', () => {
    render(<CloudMenu extraItems={extraItems} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual(['Log in / Sign up', 'Dark']);
  });

  test('offers logging out first when signed in', () => {
    auth.value = { ...auth.value, status: 'authed', username: 'mira', role: 'gm' };
    render(<CloudMenu extraItems={extraItems} />);
    fireEvent.click(screen.getByRole('button', { name: 'Account: mira' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual(['Log out', 'Dark']);
  });
});
