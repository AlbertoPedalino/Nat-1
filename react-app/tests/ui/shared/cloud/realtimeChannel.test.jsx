import { beforeEach, expect, test, vi } from 'vitest';

const m = vi.hoisted(() => ({ channel: null, removeChannel: vi.fn(), failOn: null }));

vi.mock('../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: vi.fn((topic, options) => {
      m.channel = {
        topic,
        options,
        listeners: [],
        on: vi.fn((type, filter, callback) => {
          if (m.failOn === 'on') throw new Error('socket');
          m.channel.listeners.push({ type, filter, callback });
        }),
        subscribe: vi.fn((callback) => { m.channel.status = callback; }),
        send: vi.fn(() => Promise.reject(new Error('offline'))),
      };
      return m.channel;
    }),
    removeChannel: (...args) => m.removeChannel(...args),
  },
}));

import { openRealtimeChannel, realtimeTopic } from '../../../../src/shared/cloud/realtimeChannel.js';

beforeEach(() => {
  m.removeChannel.mockReset().mockResolvedValue('ok');
  m.failOn = null;
});

test('table changes and broadcasts are registered on the public schema, the payload handed over', () => {
  const onChange = vi.fn();
  const onRoll = vi.fn();
  openRealtimeChannel('gb-x', {
    config: { broadcast: { self: false } },
    changes: [{ table: 'map_tokens', filter: 'scene_id=eq.1', onChange }, { table: 'map_token_secrets' }],
    broadcasts: { roll: onRoll },
  });
  expect(m.channel.options).toEqual({ config: { broadcast: { self: false } } });
  expect(m.channel.listeners.map(({ type, filter }) => [type, filter])).toEqual([
    ['postgres_changes', { event: '*', schema: 'public', table: 'map_tokens', filter: 'scene_id=eq.1' }],
    ['postgres_changes', { event: '*', schema: 'public', table: 'map_token_secrets' }],
    ['broadcast', { event: 'roll' }],
  ]);
  m.channel.listeners[0].callback({ new: { id: 1 } });
  m.channel.listeners[2].callback({ payload: { total: 7 } });
  expect(onChange).toHaveBeenCalledWith({ new: { id: 1 } });
  expect(onRoll).toHaveBeenCalledWith({ total: 7 });
});

test('a listener that throws or rejects, and a failing send, never escape', async () => {
  const channel = openRealtimeChannel('gb-x', {
    changes: [{ table: 't', onChange: () => { throw new Error('bad payload'); } }],
    broadcasts: { roll: () => Promise.reject(new Error('later')) },
    onStatus: () => { throw new Error('status'); },
  });
  expect(() => m.channel.listeners[0].callback({})).not.toThrow();
  expect(() => m.channel.listeners[1].callback({ payload: {} })).not.toThrow();
  expect(() => m.channel.status('SUBSCRIBED')).not.toThrow();
  expect(() => channel.send('roll', {})).not.toThrow();
  expect(m.channel.send).toHaveBeenCalledWith({ type: 'broadcast', event: 'roll', payload: {} });
  await Promise.resolve();
});

test('a channel that fails half-way is removed and reported as null; close removes once', () => {
  m.failOn = 'on';
  expect(openRealtimeChannel('gb-x', { changes: [{ table: 't' }] })).toBeNull();
  expect(m.removeChannel).toHaveBeenCalledTimes(1);

  m.failOn = null;
  m.removeChannel.mockReset().mockRejectedValue(new Error('closed'));
  const channel = openRealtimeChannel('gb-y');
  channel.close();
  channel.close();
  expect(m.removeChannel).toHaveBeenCalledTimes(1);
  channel.send('roll', {});
  expect(m.channel.send).not.toHaveBeenCalled();
});

test('one topic rule: ids pass unchanged, anything else becomes _, bounded length', () => {
  expect(realtimeTopic('gb-vtt-2f1c9a2e-0b7d-4c1e-9a55-1f2e3d4c5b6a')).toBe('gb-vtt-2f1c9a2e-0b7d-4c1e-9a55-1f2e3d4c5b6a');
  expect(realtimeTopic('hexcrawl:a:b')).toBe('hexcrawl:a:b');
  expect(realtimeTopic('gb-sheet-1-«r1»')).toBe('gb-sheet-1-_r1_');
  expect(realtimeTopic('x'.repeat(300))).toHaveLength(120);
});
