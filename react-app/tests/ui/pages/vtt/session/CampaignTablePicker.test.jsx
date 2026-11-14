import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const m = vi.hoisted(() => ({ live: vi.fn(), channels: [] }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => ({ user: { id: 'me' }, cloudEnabled: true, status: 'authed' }) }));
vi.mock('../../../../../src/shared/cloud/api/vttScenes.js', () => ({ listLiveCampaignIds: (...args) => m.live(...args) }));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({ supabase: {} }));
vi.mock('../../../../../src/shared/cloud/realtimeChannel.js', () => ({
  openRealtimeChannel: (topic, options) => {
    m.channels.push(options);
    return { close: vi.fn() };
  },
}));

import CampaignTablePicker from '../../../../../src/pages/vtt/session/CampaignTablePicker.jsx';

const campaigns = [
  { id: 'c1', name: 'Tavern', gm: 'gm-a' },
  { id: 'c2', name: 'Crypt', gm: 'gm-b' },
  { id: 'mine', name: 'Run by me', gm: 'me' },
];

const row = (name) => screen.getByText(name).closest('button');
const search = () => screen.getByRole('searchbox', { name: 'Search tables' });

beforeEach(() => { m.live.mockReset(); m.channels.length = 0; });

test('one list of every table: one run opens its scenes, one played at joins it', async () => {
  m.live.mockResolvedValue(new Set(['c2']));
  const onRun = vi.fn();
  const onJoin = vi.fn();
  render(<CampaignTablePicker campaigns={campaigns} onRun={onRun} onJoin={onJoin} />);
  await screen.findByText('Tavern');
  expect(m.live).toHaveBeenCalledWith(['c1', 'c2', 'mine']);
  expect(row('Crypt')).toHaveTextContent('Live');
  expect(row('Tavern')).toHaveTextContent('no map up');
  expect(row('Run by me')).toHaveTextContent('GM');
  fireEvent.click(row('Crypt'));
  expect(onJoin).toHaveBeenCalledWith('c2');
  fireEvent.click(row('Run by me'));
  expect(onRun).toHaveBeenCalledWith('mine');
});

test('the tables are searched by name', async () => {
  m.live.mockResolvedValue(new Set());
  render(<CampaignTablePicker campaigns={campaigns} onRun={vi.fn()} onJoin={vi.fn()} />);
  await screen.findByText('Tavern');
  fireEvent.change(search(), { target: { value: 'cry' } });
  expect(screen.queryByText('Tavern')).toBeNull();
  expect(screen.getByText('Crypt')).toBeInTheDocument();
  fireEvent.change(search(), { target: { value: 'dragon' } });
  expect(screen.getByText('No tables match.')).toBeInTheDocument();
});

test('a failed lookup still lists every table, without badges', async () => {
  m.live.mockRejectedValue(new Error('offline'));
  render(<CampaignTablePicker campaigns={campaigns} onRun={vi.fn()} onJoin={vi.fn()} />);
  await waitFor(() => expect(screen.getAllByText('no map up')).toHaveLength(3));
});

test('no table at all points to the Campaigns page', async () => {
  m.live.mockResolvedValue(new Set());
  render(<CampaignTablePicker campaigns={[]} onRun={vi.fn()} onJoin={vi.fn()} />);
  await screen.findByText(/Campaigns page/);
});

test('a table going live, or ending, shows without a reload', async () => {
  m.live.mockResolvedValue(new Set());
  render(<CampaignTablePicker campaigns={campaigns} onRun={vi.fn()} onJoin={vi.fn()} />);
  await waitFor(() => expect(screen.getAllByText('no map up')).toHaveLength(3));
  const [{ changes: [watch] }] = m.channels;
  expect(watch).toMatchObject({ table: 'campaign_live_scenes', filter: 'campaign_id=in.(c1,c2,mine)' });
  act(() => watch.onChange({ new: { campaign_id: 'c1', scene_id: 's9' } }));
  expect(row('Tavern')).toHaveTextContent('Live');
  act(() => watch.onChange({ new: { campaign_id: 'c1', scene_id: null } }));
  expect(row('Tavern')).toHaveTextContent('no map up');
});
