import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { supabase } from './supabaseClient.js';

// Shared by embedded sheets and maps. Events stay in memory;
// private GM rolls never enter the public campaign channel.
const transports = new Map();

function acquire(topic, account, privateChannel, online) {
  const key = `${account}:${topic}:${online}`;
  if (transports.has(key)) return transports.get(key);
  const listeners = new Set();
  const seen = new Set();
  const receive = (roll, origin) => {
    if (!roll || (roll.id && seen.has(roll.id))) return;
    if (roll.id) {
      seen.add(roll.id);
      if (seen.size > 200) seen.delete(seen.values().next().value);
    }
    listeners.forEach((listener) => {
      if (listener === origin) return;
      try { listener(roll); } catch (_) {}
    });
  };
  let local;
  let channel;
  try {
    local = new BroadcastChannel(`gb-local:${account}:${topic}`);
    local.onmessage = ({ data }) => receive(data);
  } catch (_) {}
  if (online) {
    try {
      channel = supabase.channel(topic, {
        config: { private: privateChannel, broadcast: { self: false } },
      });
      channel.on('broadcast', { event: 'roll' }, ({ payload }) => receive(payload));
      channel.subscribe();
    } catch (_) { channel = null; }
  }
  const transport = {
    listeners,
    publish(roll, origin) {
      receive(roll, origin);
      try { local?.postMessage(roll); } catch (_) {}
      try {
        Promise.resolve(channel?.send({ type: 'broadcast', event: 'roll', payload: roll })).catch(() => {});
      } catch (_) {}
    },
    release(listener) {
      listeners.delete(listener);
      if (listeners.size) return;
      local?.close();
      if (channel) {
        try { Promise.resolve(supabase.removeChannel(channel)).catch(() => {}); } catch (_) {}
      }
      transports.delete(key);
    },
  };
  transports.set(key, transport);
  return transport;
}

export function useRollChannel({ campaignId, onRoll, isGm = false }) {
  const { cloudEnabled, status, user } = useAuth();
  const channelsRef = useRef(null);
  const handlerRef = useRef(onRoll);
  handlerRef.current = onRoll;
  const account = user?.id || 'local';
  const online = Boolean(cloudEnabled && status === 'authed' && supabase);

  useEffect(() => {
    if (!campaignId) return undefined;
    const listener = (roll) => handlerRef.current?.(roll);
    const publicChannel = acquire(`gb-rolls-${campaignId}`, account, false, online);
    const gmChannel = isGm
      ? acquire(`gb-gm-rolls-${campaignId}`, account, true, online)
      : null;
    publicChannel.listeners.add(listener);
    gmChannel?.listeners.add(listener);
    channelsRef.current = { publicChannel, gmChannel, listener };
    return () => {
      channelsRef.current = null;
      publicChannel.release(listener);
      gmChannel?.release(listener);
    };
  }, [campaignId, account, online, isGm]);

  const publish = useCallback((roll, { visibility = 'public' } = {}) => {
    const channels = channelsRef.current;
    if (!channels || !roll) return;
    const target = visibility === 'gm' ? channels.gmChannel : channels.publicChannel;
    target?.publish({ ...roll, visibility }, channels.listener);
  }, []);

  return { publish };
}
