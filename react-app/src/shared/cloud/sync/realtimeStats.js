// Opt-in traffic counters for Supabase Realtime and REST.
//
// Off unless asked for: `localStorage['gb:rt-debug'] = '1'` (survives reloads)
// or `?rtdebug=1` in the URL (this tab only). Read at client creation, so turn
// it on and reload. When off, nothing here is attached to the client at all.
//
// Only counts and sizes are kept. Payloads are measured and dropped on the
// spot, topics have their ids masked, and REST paths lose their query string —
// so a snapshot can be pasted into a bug report without leaking sheet
// contents, tokens or row ids.

const STORAGE_KEY = 'gb:rt-debug';
const SESSION_KEY = 'gb:rt-debug-session';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Any remaining id-looking run (character ids, React useId suffixes, keys).
const ID_RUN = /[A-Za-z0-9_]*\d[A-Za-z0-9_]*/g;

export function realtimeDebugRequested({ storage, session, search } = {}) {
  try {
    if (search && new URLSearchParams(search).get('rtdebug') === '1') {
      session?.setItem(SESSION_KEY, '1');
      return true;
    }
    return storage?.getItem(STORAGE_KEY) === '1' || session?.getItem(SESSION_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function maskTopic(topic) {
  return String(topic || '')
    .replace(/^realtime:/, '')
    .replace(UUID, '*')
    .replace(ID_RUN, (run) => (run.length >= 6 ? '*' : run));
}

// "/rest/v1/map_tokens?select=…" -> "map_tokens", "/rest/v1/rpc/fn" -> "rpc:fn".
export function restLabel(url) {
  try {
    const { pathname } = new URL(String(url), 'http://local');
    const rest = pathname.match(/\/rest\/v1\/(rpc\/)?([^/]+)/);
    if (rest) return rest[1] ? `rpc:${rest[2]}` : rest[2];
    const service = pathname.match(/\/(auth|storage|realtime|functions)\/v1\//);
    return service ? service[1] : 'other';
  } catch (_) {
    return 'other';
  }
}

function sizeOf(value) {
  if (value == null) return 0;
  if (typeof value === 'string') return value.length;
  try {
    return JSON.stringify(value)?.length || 0;
  } catch (_) {
    return 0;
  }
}

// phoenix logs "push" as "<topic> <event> (<join_ref>, <ref>)" and "receive"
// as "[status] <topic> <event> [(ref)]". The topic is the realtime:/phoenix one.
function parseFrame(msg) {
  const parts = String(msg || '').split(' ');
  const at = parts.findIndex((part) => part.startsWith('realtime:') || part === 'phoenix');
  if (at < 0) return null;
  return { topic: parts[at], event: parts[at + 1] || '' };
}

// What a frame is about, without keeping what it says.
function frameKind(event, payload) {
  if (event === 'postgres_changes') {
    const data = payload?.data || {};
    return `postgres_changes ${data.table || '?'} ${data.type || ''}`.trim();
  }
  if (event === 'broadcast') return `broadcast ${payload?.event || '?'}`;
  return event;
}

function bump(bucket, key, bytes) {
  const entry = bucket[key] || (bucket[key] = { count: 0, bytes: 0 });
  entry.count += 1;
  entry.bytes += bytes;
}

export function createRealtimeStats({ now = () => Date.now() } = {}) {
  let startedAt = now();
  let byEvent = {};
  let byTopic = {};
  let rest = {};
  let tags = {};

  return {
    recordFrame(direction, msg, payload) {
      const frame = parseFrame(msg);
      if (!frame || frame.topic === 'phoenix') return;
      const bytes = sizeOf(payload);
      bump(byEvent, `${direction} ${frameKind(frame.event, payload)}`, bytes);
      bump(byTopic, `${direction} ${maskTopic(frame.topic)}`, bytes);
    },
    recordRest(method, url, bytes) {
      bump(rest, `${String(method || 'GET').toUpperCase()} ${restLabel(url)}`, Math.max(0, Number(bytes) || 0));
    },
    // Why the app made a request (syncDiagnostics.js), counted beside the
    // requests themselves: e.g. "characters full structural-refresh".
    recordTag(tag) {
      if (tag) bump(tags, String(tag), 0);
    },
    snapshot({ channels = null } = {}) {
      const seconds = Math.max(1, (now() - startedAt) / 1000);
      const rows = (bucket) => Object.entries(bucket)
        .map(([key, { count, bytes }]) => ({
          key, count, bytes, perSecond: +(count / seconds).toFixed(2), bytesPerSecond: Math.round(bytes / seconds),
        }))
        .sort((a, b) => b.bytes - a.bytes);
      const total = (bucket, direction) => Object.entries(bucket)
        .filter(([key]) => !direction || key.startsWith(`${direction} `))
        .reduce((sum, [, entry]) => ({ count: sum.count + entry.count, bytes: sum.bytes + entry.bytes }), { count: 0, bytes: 0 });
      return {
        seconds: Math.round(seconds),
        channels,
        realtime: { in: total(byEvent, 'in'), out: total(byEvent, 'out') },
        restTotal: total(rest),
        events: rows(byEvent),
        topics: rows(byTopic),
        rest: rows(rest),
        tags: rows(tags).map(({ key, count, perSecond }) => ({ key, count, perSecond })).sort((a, b) => b.count - a.count),
      };
    },
    reset() {
      startedAt = now();
      byEvent = {};
      byTopic = {};
      rest = {};
      tags = {};
    },
  };
}

// The realtime-js `logger` option: every frame the socket sends or receives.
export function realtimeLogger(stats) {
  return (kind, msg, data) => {
    if (kind === 'push') stats.recordFrame('out', msg, data);
    else if (kind === 'receive') stats.recordFrame('in', msg, data);
  };
}

// The supabase-js `global.fetch` option. Content-Length is the wire size when
// the server sends it; otherwise the decoded body is measured, which
// overstates compressed responses — an upper bound, fine for spotting a hog.
export function instrumentedFetch(stats, baseFetch) {
  return async (input, init) => {
    const response = await baseFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : input?.url;
      const method = init?.method || input?.method || 'GET';
      const header = response.headers?.get?.('content-length');
      if (header != null && Number.isFinite(Number(header))) {
        stats.recordRest(method, url, Number(header));
      } else {
        response.clone().text()
          .then((body) => stats.recordRest(method, url, body.length))
          .catch(() => stats.recordRest(method, url, 0));
      }
    } catch (_) {
      // Diagnostics must never break a request.
    }
    return response;
  };
}

// Client options to spread into createClient, or null when disabled.
export function realtimeDiagnosticsOptions(stats, baseFetch) {
  if (!stats) return null;
  return {
    realtime: { logger: realtimeLogger(stats) },
    global: { fetch: instrumentedFetch(stats, baseFetch) },
  };
}

// `window.__gbRt.snapshot()` / `.table()` / `.reset()` in the console.
export function exposeRealtimeDiagnostics(stats, client, target = globalThis) {
  if (!stats || !target) return;
  const channels = () => {
    try { return client?.getChannels?.().length ?? null; } catch (_) { return null; }
  };
  target.__gbRt = {
    snapshot: () => stats.snapshot({ channels: channels() }),
    table() {
      const snap = stats.snapshot({ channels: channels() });
      /* eslint-disable no-console */
      console.info(`[gb-rt] ${snap.seconds}s, ${snap.channels ?? '?'} channels, realtime in ${snap.realtime.in.count}/${snap.realtime.in.bytes}B, out ${snap.realtime.out.count}/${snap.realtime.out.bytes}B, REST ${snap.restTotal.count}/${snap.restTotal.bytes}B`);
      console.table(snap.events);
      console.table(snap.topics);
      console.table(snap.rest);
      console.table(snap.tags);
      /* eslint-enable no-console */
      return snap;
    },
    reset: () => stats.reset(),
  };
}
