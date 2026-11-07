import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { supabase } from '../supabaseClient.js';
import { openRealtimeChannel } from '../realtimeChannel.js';

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
  try {
    local = new BroadcastChannel(`gb-local:${account}:${topic}`);
    local.onmessage = ({ data }) => receive(data);
  } catch (_) {}
  const channel = online
    ? openRealtimeChannel(topic, {
      config: { private: privateChannel, broadcast: { self: false } },
      broadcasts: { roll: (payload) => receive(payload) },
    })
    : null;
  const transport = {
    listeners,
    publish(roll, origin) {
      receive(roll, origin);
      try { local?.postMessage(roll); } catch (_) {}
      channel?.send('roll', roll);
    },
    release(listener) {
      listeners.delete(listener);
      if (listeners.size) return;
      local?.close();
      channel?.close();
      transports.delete(key);
    },
  };
  transports.set(key, transport);
  return transport;
}

export function useRollChannel({ campaignId, onRoll, isGm = false }) {
  const { user, cloudActive } = useAuth();
  const channelsRef = useRef(null);
  const handlerRef = useRef(onRoll);
  handlerRef.current = onRoll;
  const account = user?.id || 'local';
  const online = Boolean(cloudActive && supabase);

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
