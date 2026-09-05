import { act, renderHook } from '@testing-library/react';
import { useRollChannel } from './useRollChannel.js';

const mocks = vi.hoisted(() => ({ channels: [], auth: { cloudEnabled: true, status: 'authed', user: { id: 'gm' } } }));
vi.mock('./AuthProvider.jsx', () => ({ useAuth: () => mocks.auth }));
vi.mock('./supabaseClient.js', () => ({ supabase: {
  channel: (topic, options) => {
    const channel = { topic, options, send: vi.fn().mockResolvedValue('ok'), subscribe: vi.fn(),
      on: vi.fn((type, event, callback) => { channel.receive = callback; }) };
    mocks.channels.push(channel);
    return channel;
  },
  removeChannel: vi.fn(),
} }));

beforeEach(() => { mocks.channels = []; });

test('sheet and map share one subscription, with immediate delivery and no network echo duplicate', () => {
  const sheetRoll = vi.fn();
  const mapRoll = vi.fn();
  const { result } = renderHook(() => ({
    sheet: useRollChannel({ campaignId: 'one', onRoll: sheetRoll }),
    map: useRollChannel({ campaignId: 'one', onRoll: mapRoll }),
  }));
  const roll = { id: 'one', label: 'Attack', total: 15 };
  act(() => result.current.sheet.publish(roll));
  expect(mocks.channels).toHaveLength(1);
  expect(sheetRoll).not.toHaveBeenCalled();
  expect(mapRoll).toHaveBeenCalledTimes(1);
  act(() => mocks.channels[0].receive({ payload: roll }));
  expect(mapRoll).toHaveBeenCalledTimes(1);
});

test('hidden monster/custom rolls go only to the private GM channel and GM log', () => {
  const gmLog = vi.fn();
  const playerLog = vi.fn();
  const { result } = renderHook(() => ({
    encounter: useRollChannel({ campaignId: 'one', isGm: true }),
    map: useRollChannel({ campaignId: 'one', isGm: true, onRoll: gmLog }),
    player: useRollChannel({ campaignId: 'one', onRoll: playerLog }),
  }));
  act(() => result.current.encounter.publish({ id: 'secret' }, { visibility: 'gm' }));
  expect(gmLog).toHaveBeenCalledWith({ id: 'secret', visibility: 'gm' });
  expect(playerLog).not.toHaveBeenCalled();
  const publicChannel = mocks.channels.find((channel) => !channel.options.config.private);
  const privateChannel = mocks.channels.find((channel) => channel.options.config.private);
  expect(publicChannel.send).not.toHaveBeenCalled();
  expect(privateChannel.send).toHaveBeenCalledTimes(1);
  act(() => result.current.encounter.publish({ id: 'public' }));
  expect(playerLog).toHaveBeenCalledWith({ id: 'public', visibility: 'public' });
});

test('campaign changes stop delivery from the previous campaign', () => {
  const listener = vi.fn();
  const { result, rerender } = renderHook(({ campaignId }) => ({
    sender: useRollChannel({ campaignId: 'one' }),
    receiver: useRollChannel({ campaignId, onRoll: listener }),
  }), { initialProps: { campaignId: 'one' } });
  rerender({ campaignId: 'two' });
  act(() => result.current.sender.publish({ id: 'old-campaign' }));
  expect(listener).not.toHaveBeenCalled();
});
