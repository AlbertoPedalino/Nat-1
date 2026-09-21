import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { fetchCloudMeta } from '../api/cloudCharacters.js';

const CAMPAIGN_RETRY_MS = 5000;

// A sheet needs its campaign before it can share rolls with other devices.
// Recover a failed lookup without requiring the player to reload the sheet.
export function useCharacterCampaign(charId) {
  const { cloudEnabled, status, user } = useAuth();
  const account = user?.id || null;
  const enabled = Boolean(charId && cloudEnabled && status === 'authed' && account);
  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    setResolved(null);
    if (!enabled) return undefined;

    let cancelled = false;
    let loading = false;
    let complete = false;
    let timer;
    const refresh = async () => {
      if (cancelled || loading || complete) return;
      window.clearTimeout(timer);
      loading = true;
      try {
        const meta = await fetchCloudMeta(charId);
        if (cancelled) return;
        complete = true;
        setResolved({ charId, account, campaignId: meta?.campaign_id || null });
      } catch (_) {
        if (!cancelled) timer = window.setTimeout(refresh, CAMPAIGN_RETRY_MS);
      } finally {
        loading = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [charId, account, enabled]);

  return enabled && resolved?.charId === charId && resolved.account === account
    ? resolved.campaignId : null;
}
