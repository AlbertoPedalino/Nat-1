import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import LinkedToolsMenu from './LinkedToolsMenu.jsx';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  notify: vi.fn(),
  readLocalToolInstances: vi.fn(),
  setLocalInstanceLink: vi.fn(),
  fetchInstanceMeta: vi.fn(),
  listInstances: vi.fn(),
  auth: { cloudEnabled: false, status: 'anon' },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('../shared/cloud/AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../shared/cloud/cloudSections.js', () => ({
  getCloudSection: (sectionKey) => ({
    fetchInstanceMeta: (id) => mocks.fetchInstanceMeta(sectionKey, id),
    listInstances: () => mocks.listInstances(sectionKey),
  }),
}));
vi.mock('../shared/ToastProvider.jsx', () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock('../shared/instanceLinks.js', async (importOriginal) => ({
  ...await importOriginal(),
  readLocalToolInstances: mocks.readLocalToolInstances,
  setLocalInstanceLink: mocks.setLocalInstanceLink,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.cloudEnabled = false;
  mocks.auth.status = 'anon';
  mocks.fetchInstanceMeta.mockResolvedValue(null);
  mocks.listInstances.mockResolvedValue([]);
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

test('a cloud-only instance can manage links without a local copy', async () => {
  mocks.auth.cloudEnabled = true;
  mocks.auth.status = 'authed';
  mocks.readLocalToolInstances.mockReturnValue([]);
  mocks.fetchInstanceMeta.mockResolvedValue({ id: 'cloud-board', link_group_id: null });
  mocks.listInstances.mockImplementation(async (sectionKey) => (
    sectionKey === 'gmboard'
      ? [{ id: 'cloud-board', name: 'Cloud Board', link_group_id: null, updated_at: '2026-08-01T00:00:00Z' }]
      : []
  ));

  render(<LinkedToolsMenu sectionKey="gmboard" instanceId="cloud-board" instanceSaved={false} />);

  await waitFor(() => expect(screen.getByRole('button', { name: 'Linked tools' })).toBeEnabled());
  expect(mocks.fetchInstanceMeta).toHaveBeenCalledWith('gmboard', 'cloud-board');
  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  expect(await screen.findByRole('dialog', { name: 'Linked tools' })).toBeInTheDocument();
});
