import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import LinkedToolsMenu from './LinkedToolsMenu.jsx';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  notify: vi.fn(),
  readLocalToolInstances: vi.fn(),
  setLocalInstanceLink: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('../shared/cloud/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: false, status: 'anon' }),
}));
vi.mock('../shared/cloud/cloudSections.js', () => ({ getCloudSection: vi.fn() }));
vi.mock('../shared/ToastProvider.jsx', () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock('../shared/instanceLinks.js', async (importOriginal) => ({
  ...await importOriginal(),
  readLocalToolInstances: mocks.readLocalToolInstances,
  setLocalInstanceLink: mocks.setLocalInstanceLink,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readLocalToolInstances.mockReturnValue([
    {
      id: 'board-a', name: 'Board A', sectionKey: 'gmboard', linkGroupId: 'link_party', origin: 'local', hasLocal: true,
    },
    {
      id: 'screen-a', name: 'Session Notes', sectionKey: 'dmscreen', linkGroupId: 'link_party', origin: 'local', hasLocal: true,
    },
  ]);
});

test('linked-tools dialog opens a linked instance from the top bar', async () => {
  render(
    <LinkedToolsMenu
      sectionKey="gmboard"
      instanceId="board-a"
      instanceSaved
      initialLinkGroupId="link_party"
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  const link = await screen.findByRole('link', { name: /Session Notes/ });

  expect(link).toHaveAttribute('href', '/dm-screen?screen=screen-a');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('an unsaved instance cannot open link management', () => {
  render(<LinkedToolsMenu sectionKey="gmboard" instanceId="draft" instanceSaved={false} />);
  expect(screen.getByRole('button', { name: 'Linked tools' })).toBeDisabled();
});
