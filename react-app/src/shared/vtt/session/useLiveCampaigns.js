import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../cloud/auth/AuthProvider.jsx';
import { supabase } from '../../cloud/supabaseClient.js';
import { openRealtimeChannel } from '../../cloud/realtimeChannel.js';
import { listLiveCampaignIds } from '../../cloud/api/vttScenes.js';
import { watchRevisions } from '../../cloud/sync/recoveryTriggers.js';
import { syncKeys } from '../../cloud/sync/syncKeys.js';

// Which of these campaigns have a map up, kept current: the "Join a table"
// list shows Live the moment a GM puts a scene on, without a reload. The
// same model as useLiveSession, for several campaigns at once: one read, then
// `campaign_live_scenes` through Realtime, and a re-read when the sync digest
// says a row moved that Realtime may have missed (sleep, network, a hidden tab).
export function useLiveCampaigns(campaignIds) {
  const { cloudEnabled, status } = useAuth();
  const [state, setState] = useState({ loading: true, live: new Set() });
  const requestRef = useRef(0);
  const idsKey = [...new Set((campaignIds || []).filter(Boolean).map(String))].sort().join(',');

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    const ids = idsKey ? idsKey.split(',') : [];
    try {
      const live = await listLiveCampaignIds(ids);
      if (request === requestRef.current) setState({ loading: false, live });
    } catch (_) {
      // A failed lookup only loses the badges: every table can still be joined.
      if (request === requestRef.current) setState((current) => ({ ...current, loading: false }));
      return false;
    }
    return true;
  }, [idsKey]);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (!ids.length || !cloudEnabled || status !== 'authed') {
      requestRef.current += 1;
      setState({ loading: false, live: new Set() });
      return undefined;
    }
    refresh();

    const channel = supabase ? openRealtimeChannel(`gb-vtt-live-campaigns-${ids.join('-')}`, {
      changes: [{
        table: 'campaign_live_scenes',
        filter: `campaign_id=in.(${ids.join(',')})`,
        onChange: (payload) => {
          const row = payload?.new;
          if (!row?.campaign_id || !Object.hasOwn(row, 'scene_id')) {
            refresh();
            return;
          }
          // The event is the answer; a read still in flight is older.
          requestRef.current += 1;
          setState((current) => {
            const live = new Set(current.live);
            if (row.scene_id) live.add(row.campaign_id);
            else live.delete(row.campaign_id);
            return { loading: false, live };
          });
        },
      }],
      onStatus: (state) => { if (state === 'SUBSCRIBED') refresh(); },
    }) : null;

    const stopRecovery = watchRevisions(ids.map((id) => syncKeys.liveScene(id)), () => refresh(), { whenHidden: true });

    return () => {
      requestRef.current += 1;
      stopRecovery();
      channel?.close();
    };
  }, [cloudEnabled, idsKey, refresh, status]);

  return state;
}
