import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const auth = vi.hoisted(() => ({ value: {} }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => auth.value }));
vi.mock('../../../../../src/shared/cloud/auth/AuthDialog.jsx', () => ({
  default: ({ open }) => (open ? <div role="dialog" aria-label="Log in / Sign up" /> : null),
}));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: vi.fn() }) }));

const { default: CloudMenu } = await import('../../../../../src/shared/cloud/auth/CloudMenu.jsx');

describe('CloudMenu', () => {
  beforeEach(() => {
    auth.value = { cloudEnabled: true, status: 'anon', username: null, role: null, signOut: vi.fn() };
  });

  test('draws nothing without the online features', () => {
    auth.value = { ...auth.value, cloudEnabled: false };
    render(<CloudMenu />);
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument();
  });

  test('signed out, Log in opens the login panel straight away, with no menu in between', () => {
    render(<CloudMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByRole('dialog', { name: 'Log in / Sign up' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('signed in, the account opens its menu with logging out', () => {
    auth.value = { ...auth.value, status: 'authed', username: 'mira', role: 'gm' };
    render(<CloudMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Account: mira' }));
    expect(screen.getByText('mira · GM')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual(['Log out']);
  });
});
