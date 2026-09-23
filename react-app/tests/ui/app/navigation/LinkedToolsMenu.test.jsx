import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  linkBoardCampaign: vi.fn(),
  setCampaignGroup: vi.fn(),
  setCampaignBoard: vi.fn(),
  setLinkGroup: vi.fn(),
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
    setLinkGroup: (id, group) => mocks.setLinkGroup(sectionKey, id, group),
  }),
}));
vi.mock('../../../../src/shared/cloud/api/campaigns.js', () => ({ listMyCampaigns: mocks.listMyCampaigns }));
vi.mock('../../../../src/shared/cloud/api/hexcrawl.js', () => ({ setCampaignHexcrawlBoard: mocks.setCampaignBoard, linkHexcrawlBoardCampaign: mocks.linkBoardCampaign }));
vi.mock('../../../../src/shared/cloud/api/campaignTools.js', () => ({ setCampaignToolGroup: mocks.setCampaignGroup }));
vi.mock('../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock('../../../../src/shared/instances/instanceLinks.js', async (importOriginal) => ({
  ...await importOriginal(),
  readLocalToolInstances: mocks.readLocalToolInstances,
  setLocalInstanceLink: mocks.setLocalInstanceLink,
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.cloudEnabled = false;
  mocks.auth.status = 'anon';
  mocks.auth.user = null;
  mocks.listMyCampaigns.mockResolvedValue([]);
  mocks.linkBoardCampaign.mockResolvedValue();
  mocks.setCampaignGroup.mockResolvedValue();
  mocks.setCampaignBoard.mockResolvedValue();
  mocks.setLinkGroup.mockResolvedValue();
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

async function chooseTool(name) {
  fireEvent.click(await screen.findByRole('button', { name: 'Add tool or campaign' }));
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Add a tool or campaign' }));
  const option = await screen.findByRole('option', { name });
  await act(async () => { fireEvent.click(option); });
}

test('campaigns join the same list as the other tools', async () => {
  mocks.auth.cloudEnabled = true;
  mocks.auth.status = 'authed';
  mocks.auth.user = { id: 'gm-one' };
  const campaign = { id: 'campaign-one', name: 'Campaign One', gm: 'gm-one', hexcrawl_board_id: null };
  mocks.listMyCampaigns.mockResolvedValue([campaign]);
  mocks.setCampaignGroup.mockImplementation(async (_id, group) => { campaign.link_group_id = group; });
  render(<LinkedToolsMenu sectionKey="gmboard" instanceId="board-a" instanceSaved />);
  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  await chooseTool(/Campaign One/);
  await waitFor(() => expect(mocks.setCampaignGroup).toHaveBeenCalledWith('campaign-one', 'link_party'));
  expect(mocks.linkBoardCampaign).toHaveBeenCalledWith('board-a', 'campaign-one');
  expect(await screen.findByRole('link', { name: 'Open Campaign One' })).toHaveAttribute('href', '/vtt?campaign=campaign-one');
  expect(screen.queryByText('Linked instances')).not.toBeInTheDocument();
  expect(screen.queryByText('Create and link')).not.toBeInTheDocument();
});

test('removing the GM Board keeps the battlemap connected to the other tools', async () => {
  mocks.auth.cloudEnabled = true;
  mocks.auth.status = 'authed';
  mocks.auth.user = { id: 'gm-one' };
  const campaign = { id: 'campaign-one', name: 'Campaign One', gm: 'gm-one', link_group_id: 'link_party', hexcrawl_board_id: 'board-a' };
  mocks.listMyCampaigns.mockResolvedValue([campaign]);
  const local = mocks.readLocalToolInstances();
  local.push({ id: 'enc-a', name: 'Fights', sectionKey: 'encounters', linkGroupId: 'link_party', origin: 'local', hasLocal: true });
  mocks.setLocalInstanceLink.mockImplementation((section, id, group) => {
    local.find((row) => row.sectionKey === section && row.id === id).linkGroupId = group;
  });
  mocks.setCampaignBoard.mockImplementation(async (_id, board) => { campaign.hexcrawl_board_id = board; });
  render(<LinkedToolsMenu sectionKey="campaign" instanceId="campaign-one" instanceSaved />);
  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Unlink Board A' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Open Board A' })).not.toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'Open Session Notes' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Fights' })).toBeInTheDocument();
  expect(mocks.setLocalInstanceLink.mock.calls).toEqual([['gmboard', 'board-a', null]]);
  expect(mocks.setCampaignBoard).toHaveBeenCalledWith('campaign-one', null);
  expect(mocks.setCampaignGroup).not.toHaveBeenCalled();
  expect(campaign.link_group_id).toBe('link_party');
});

test('a campaign without a GM Board can link an Encounter Builder directly', async () => {
  mocks.auth.cloudEnabled = true;
  mocks.auth.status = 'authed';
  mocks.auth.user = { id: 'gm-one' };
  mocks.listMyCampaigns.mockResolvedValue([{ id: 'campaign-one', name: 'Campaign One', gm: 'gm-one' }]);
  mocks.readLocalToolInstances.mockReturnValue([{ id: 'enc-a', name: 'Fights', sectionKey: 'encounters', hasLocal: true }]);
  render(<LinkedToolsMenu sectionKey="campaign" instanceId="campaign-one" instanceSaved />);
  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  await chooseTool(/Fights/);
  await waitFor(() => expect(mocks.setCampaignGroup).toHaveBeenCalledWith('campaign-one', expect.stringMatching(/^link_/)));
  expect(mocks.setLocalInstanceLink).toHaveBeenCalledWith('encounters', 'enc-a', expect.stringMatching(/^link_/));
  expect(mocks.setCampaignBoard).not.toHaveBeenCalled();
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
  await chooseTool('New DM Screen');

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


test('unlinking a campaign changes no other member', async () => {
  mocks.auth.cloudEnabled = true;
  mocks.auth.status = 'authed';
  mocks.auth.user = { id: 'gm-one' };
  const campaign = { id: 'campaign-one', name: 'Campaign One', gm: 'gm-one', link_group_id: 'link_party' };
  mocks.listMyCampaigns.mockResolvedValue([campaign]);
  mocks.setCampaignGroup.mockImplementation(async (_id, group) => { campaign.link_group_id = group; });
  render(<LinkedToolsMenu sectionKey="gmboard" instanceId="board-a" instanceSaved />);
  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Unlink Campaign One' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Open Campaign One' })).not.toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'Open Session Notes' })).toBeInTheDocument();
  expect(mocks.setCampaignGroup.mock.calls).toEqual([['campaign-one', null]]);
  expect(mocks.setLocalInstanceLink).not.toHaveBeenCalled();
});

test('a failed cloud list blocks membership changes while showing available links', async () => {
  mocks.auth.cloudEnabled = true;
  mocks.auth.status = 'authed';
  mocks.listInstances.mockRejectedValue(new Error('offline'));
  render(<LinkedToolsMenu sectionKey="gmboard" instanceId="board-a" instanceSaved />);
  fireEvent.click(screen.getByRole('button', { name: 'Linked tools' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Some links could not be loaded');
  expect(screen.getByRole('button', { name: 'Unlink Board A' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add tool or campaign' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Open Session Notes' })).toBeInTheDocument();
});
