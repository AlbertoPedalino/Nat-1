import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRealtimeStats,
  exposeRealtimeDiagnostics,
  instrumentedFetch,
  maskTopic,
  realtimeDebugRequested,
  realtimeDiagnosticsOptions,
  realtimeLogger,
  restLabel,
} from '../../../../../src/shared/cloud/sync/realtimeStats.js';

function memoryStorage(values = {}) {
  const data = new Map(Object.entries(values));
  return { getItem: (key) => (data.has(key) ? data.get(key) : null), setItem: (key, value) => data.set(key, value) };
}

test('diagnostics are off unless explicitly requested', () => {
  assert.equal(realtimeDebugRequested({ storage: memoryStorage(), session: memoryStorage(), search: '' }), false);
  assert.equal(realtimeDebugRequested({ storage: memoryStorage({ 'gb:rt-debug': '1' }), session: memoryStorage() }), true);
  const session = memoryStorage();
  assert.equal(realtimeDebugRequested({ storage: memoryStorage(), session, search: '?scene=x&rtdebug=1' }), true);
  // The URL flag sticks to the tab so in-app navigation keeps it.
  assert.equal(realtimeDebugRequested({ storage: memoryStorage(), session, search: '' }), true);
  assert.equal(realtimeDiagnosticsOptions(null, fetch), null);
});

test('topics and REST paths lose their ids', () => {
  assert.equal(maskTopic('realtime:gb-vtt-0b7e1d7c-8e0d-4c2a-9a1f-3b4c5d6e7f80'), 'gb-vtt-*');
  assert.equal(maskTopic('realtime:gb-character-live-char_12345-_r_1_'), 'gb-character-live-*-_r_1_');
  assert.equal(restLabel('https://x.supabase.co/rest/v1/map_tokens?select=id&scene_id=eq.abc'), 'map_tokens');
  assert.equal(restLabel('https://x.supabase.co/rest/v1/rpc/commit_character_vitals'), 'rpc:commit_character_vitals');
  assert.equal(restLabel('https://x.supabase.co/auth/v1/token?grant_type=refresh'), 'auth');
});

test('frames are counted per table, broadcast event and masked topic, never stored', () => {
  let clock = 0;
  const stats = createRealtimeStats({ now: () => clock });
  const log = realtimeLogger(stats);
  const secret = { data: { table: 'characters', type: 'UPDATE', record: { data: { notes: 'private' } } } };
  log('receive', 'realtime:gb-vtt-0b7e1d7c-8e0d-4c2a-9a1f-3b4c5d6e7f80 postgres_changes', secret);
  log('push', 'realtime:gb-vtt-0b7e1d7c-8e0d-4c2a-9a1f-3b4c5d6e7f80 broadcast (1, 2)', { event: 'token-drag', payload: { x: 1 } });
  log('receive', 'phoenix phx_reply (3)', { status: 'ok' });
  log('transport', 'connected', {});
  clock = 10_000;
  const snap = stats.snapshot({ channels: 2 });
  assert.equal(snap.seconds, 10);
  assert.equal(snap.channels, 2);
  assert.equal(snap.realtime.in.count, 1);
  assert.equal(snap.realtime.out.count, 1);
  const inbound = snap.events.find((row) => row.key === 'in postgres_changes characters UPDATE');
  assert.equal(inbound.bytes, JSON.stringify(secret).length);
  assert.equal(inbound.perSecond, 0.1);
  assert.ok(snap.events.some((row) => row.key === 'out broadcast token-drag'));
  assert.ok(snap.topics.some((row) => row.key === 'in gb-vtt-*'));
  assert.equal(JSON.stringify(snap).includes('private'), false);
  stats.reset();
  assert.equal(stats.snapshot().events.length, 0);
});

test('REST responses are sized from Content-Length, or from the body without it', async () => {
  const stats = createRealtimeStats();
  const withLength = instrumentedFetch(stats, async () => new Response('abc', { headers: { 'content-length': '1234' } }));
  const response = await withLength('https://x.supabase.co/rest/v1/characters?select=data', { method: 'GET' });
  assert.equal(await response.text(), 'abc');
  const withoutLength = instrumentedFetch(stats, async () => new Response('abcdef'));
  await withoutLength('https://x.supabase.co/rest/v1/map_scenes?id=eq.1');
  for (let tick = 0; tick < 20 && stats.snapshot().rest.length < 2; tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const rest = Object.fromEntries(stats.snapshot().rest.map((row) => [row.key, row.bytes]));
  assert.deepEqual(rest, { 'GET characters': 1234, 'GET map_scenes': 6 });
});

test('the console handle reports channels from the client', () => {
  const stats = createRealtimeStats();
  const target = {};
  exposeRealtimeDiagnostics(stats, { getChannels: () => [1, 2, 3] }, target);
  assert.equal(target.__gbRt.snapshot().channels, 3);
});
