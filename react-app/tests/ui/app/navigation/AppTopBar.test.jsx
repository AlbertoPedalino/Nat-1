import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

// The account menu needs the auth and toast providers; this suite is about the
// compendium button beside it.
vi.mock('../../../../src/shared/cloud/auth/CloudMenu.jsx', () => ({ default: () => null }));

const { default: AppTopBar } = await import('../../../../src/app/navigation/AppTopBar.jsx');

describe('AppTopBar', () => {
  test('offers the compendium on every page by default', () => {
    render(<MemoryRouter><AppTopBar home /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Compendium' })).toBeInTheDocument();
  });

  test('leaves it out on the compendium page itself', () => {
    render(<MemoryRouter><AppTopBar home compendium={false} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Compendium' })).not.toBeInTheDocument();
  });
});
