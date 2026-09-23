import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import LinkedToolsMenu from '../../../../src/app/navigation/LinkedToolsMenu.jsx';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  notify: vi.fn(),
  readLocalToolInstances: vi.fn(),
  setLocalInstanceLink: vi.fn(),
  fetchInstanceMeta: vi.fn(),
  listInstances: vi.fn(),
  listMyCampaigns: vi.fn(),
  linkCampaign: vi.fn(),
  pushInstance: vi.fn(),
  auth: { cloudEnabled: false, status: 'anon' },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../../../../src/shared/cloud/sections/cloudSections.js', () => ({
  getCloudSection: (sectionKey) => ({
    fetchInstanceMeta: (id) => mocks.fetchInstanceMeta(sectionKey, id),
    listInstances: () => mocks.listInstances(sectionKey),
    pushInstance: mocks.pushInstance,
  }),
}));
vi.mock('../../../../src/shared/cloud/api/campaigns.js', () => ({ listMyCampaigns: mocks.listMyCampaigns }));
vi.mock('../../../../src/shared/cloud/api/hexcrawl.js', () => ({ linkHexcrawlBoardCampaign: mocks.linkCampaign }));
vi.mock('../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock('../../../../src/shared/instances/instanceLinks.js', async (importOriginal) => ({
  ...await importOriginal(),
  readLocalToolInstances: mocks.readLocalToolInstances,
  setLocalInstanceLink: mocks.setLocalInstanceLink,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.cloudEnabled = false;
  mocks.auth.status = 'anon';
  mocks.auth.user = null;
  mocks.listMyCampaigns.mockResolvedValue([]);
  mocks.linkCampaign.mockResolvedValue();
  mocks.pushInstance.mockResolvedValue({ id: 'board-a' });
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

test('Links connects the campaign directly, without a separate clock assignment', async () => {
  mocks.auth.cloudEnabled = true;
  mocks.auth.status = 'authed';
  mocks.auth.user = { id: 'gm-one' };
  const campaign = { id: 'campaign-one', name: 'Campaign One', gm: 'gm-one', hexcrawl_board_id: null };
  mocks.listMyCampaigns.mockResolvedValue([campaign]);
  mocks.linkCampaign.mockImplementation(async () => { campaign.hexcrawl_board_id = 'board-a'; });
  render(<LinkedToolsMenu sectionKey="gmboard" instanceId="board-a" instanceSaved />);
  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  const select = await screen.findByRole('combobox', { name: 'Linked campaign' });
  await waitFor(() => expect(select).not.toHaveAttribute('aria-disabled', 'true'));
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByRole('option', { name: 'Campaign One' }));
  await waitFor(() => expect(mocks.linkCampaign).toHaveBeenCalledWith('board-a', 'campaign-one'));
  expect(mocks.pushInstance).toHaveBeenCalledWith('board-a');
  await waitFor(() => expect(select).toHaveTextContent('Campaign One'));
  expect(screen.queryByLabelText(/keeps.*clock/i)).not.toBeInTheDocument();
});

test('a borrowed links menu can include its own GM Board destination', async () => {
  render(
    <LinkedToolsMenu
      sectionKey="gmboard"
      instanceId="board-a"
      instanceSaved
      initialLinkGroupId="link_party"
      showCurrentLink
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  const board = await screen.findByRole('link', { name: /Board A/ });
  expect(board).toHaveAttribute('href', '/gmboard?board=board-a');
});

test('an unsaved instance cannot open link management', () => {
  render(<LinkedToolsMenu sectionKey="gmboard" instanceId="draft" instanceSaved={false} />);
  expect(screen.getByRole('button', { name: 'Linked tools' })).toBeDisabled();
});

test('creating a linked tool registers it with the group before navigating', async () => {
  localStorage.clear();
  render(
    <LinkedToolsMenu
      sectionKey="gmboard"
      instanceId="board-a"
      instanceSaved
      initialLinkGroupId="link_party"
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  fireEvent.click(await screen.findByRole('button', { name: 'New DM Screen' }));

  await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
  const registry = JSON.parse(localStorage.getItem('gb_dmscreen_registry') || '[]');
  expect(registry).toHaveLength(1);
  expect(registry[0].linkGroupId).toBe('link_party');
  // Navigation targets the created id, never the `?screen=new` draft route.
  expect(mocks.navigate).toHaveBeenCalledWith(`/dm-screen?screen=${registry[0].id}`);
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
