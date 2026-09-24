import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const m = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('../../../../../src/shared/cloud/api/vtt.js', () => ({ listLiveCampaignIds: (...args) => m.live(...args) }));

import CampaignSessionPicker from '../../../../../src/pages/vtt/session/CampaignSessionPicker.jsx';

const campaigns = [
  { id: 'c1', name: 'Tavern', gm: 'gm-a' },
  { id: 'c2', name: 'Crypt', gm: 'gm-b' },
  { id: 'mine', name: 'Run by me', gm: 'me' },
];

beforeEach(() => { m.live.mockReset(); });

test('marks only the campaigns with a scene up, asking only about the ones joined as a player', async () => {
  m.live.mockResolvedValue(new Set(['c2']));
  const onJoin = vi.fn();
  render(<CampaignSessionPicker campaigns={campaigns} onJoin={onJoin} />);
  await screen.findByText('Tavern');
  expect(m.live).toHaveBeenCalledWith(['c1', 'c2']);
  expect(screen.queryByText('Run by me')).toBeNull();
  const crypt = screen.getByText('Crypt').closest('button');
  expect(crypt).toHaveTextContent('Live');
  expect(screen.getByText('Tavern').closest('button')).toHaveTextContent('no map up');
  fireEvent.click(crypt);
  expect(onJoin).toHaveBeenCalledWith('c2');
});

test('a failed lookup still lists every table, without badges', async () => {
  m.live.mockRejectedValue(new Error('offline'));
  render(<CampaignSessionPicker campaigns={campaigns} onJoin={vi.fn()} />);
  await waitFor(() => expect(screen.getAllByText('no map up')).toHaveLength(2));
});

test('someone who only runs campaigns sees the invite hint, or nothing when asked', async () => {
  m.live.mockResolvedValue(new Set());
  const { unmount } = render(<CampaignSessionPicker campaigns={[campaigns[2]]} onJoin={vi.fn()} />);
  await screen.findByText(/Ask your GM for the invite code/);
  unmount();
  const { container } = render(<CampaignSessionPicker campaigns={[campaigns[2]]} onJoin={vi.fn()} showEmpty={false} />);
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});
