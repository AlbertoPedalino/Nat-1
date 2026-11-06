import { supabase } from './supabaseClient.js';

// Every realtime subscription in the app opens through here, so they all
// behave the same way:
// - the topic is cleaned by one rule (ids pass unchanged, so a broadcast
//   topic two clients share stays equal);
// - a listener that throws, or whose promise rejects, never takes the socket
//   down — realtime is opportunistic and the recovery reads repair;
// - `onStatus` hears the channel state: on SUBSCRIBED the caller reads again,
//   since a reconnect does not replay what was missed;
// - a channel that fails half-way through setup is removed, not left joined;
// - closing never throws.
//
// `changes`: [{ table, event = '*', filter, onChange(payload) }] on the public
// schema. `broadcasts`: { event: onMessage(payload) }. `config` is passed to
// the channel as is (broadcast self, private).
// Returns { send(event, payload), close() }, or null when there is no client
// or the channel could not be built.
export function openRealtimeChannel(topic, { config, changes = [], broadcasts = {}, onStatus } = {}) {
  if (!supabase) return null;
  let channel = null;
  const close = () => {
    const current = channel;
    channel = null;
    if (!current) return;
    try { Promise.resolve(supabase.removeChannel(current)).catch(() => {}); } catch (_) {}
  };
  try {
    channel = supabase.channel(realtimeTopic(topic), config ? { config } : undefined);
    for (const { table, event = '*', filter, onChange } of changes) {
      channel.on('postgres_changes', { event, schema: 'public', table, ...(filter ? { filter } : {}) }, guarded(onChange));
    }
    for (const [event, onMessage] of Object.entries(broadcasts)) {
      channel.on('broadcast', { event }, guarded((message) => onMessage?.(message?.payload ?? null)));
    }
    channel.subscribe(guarded(onStatus));
  } catch (_) {
    close();
    return null;
  }
  return {
    send(event, payload) {
      if (!channel) return;
      try { Promise.resolve(channel.send({ type: 'broadcast', event, payload })).catch(() => {}); } catch (_) {}
    },
    close,
  };
}

export function realtimeTopic(topic) {
  return String(topic).replace(/[^a-z0-9_:,-]/gi, '_').slice(0, 120);
}

function guarded(listener) {
  return (...args) => {
    try {
      const result = listener?.(...args);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {}
  };
}
