import { useEffect, useState } from 'react';
import { useAuth } from '../cloud/auth/AuthProvider.jsx';
import { readHexcrawlBoardCampaign } from '../cloud/api/hexcrawl.js';
import { listenForRecovery } from '../cloud/sync/recoveryTriggers.js';
import { CAMPAIGN_BOARD_LINK_CHANGED_EVENT } from '../appEvents.js';

// The board-campaign link changes rarely and local changes announce
// themselves; the shared recovery triggers catch another device's edit.

// Read the same campaign -> board relation as the map. Saved board blobs never
// decide which campaign receives writes, including after a link is replaced.
export function useBoardCampaign(boardId) {
  const { cloudEnabled, status } = useAuth();
  const active = Boolean(boardId && cloudEnabled && status === 'authed');
  const [state, setState] = useState({ boardId: null, campaign: null, error: null });
  useEffect(() => {
    let cancelled = false;
    let request = 0;
    setState({ boardId, campaign: null, error: null });
    if (!active) return undefined;
    const refresh = async () => {
      const ticket = ++request;
      try {
        const campaign = await readHexcrawlBoardCampaign(boardId);
        if (!cancelled && ticket === request) setState({ boardId, campaign, error: null });
      } catch (cause) {
        if (!cancelled && ticket === request) {
          setState({ boardId, campaign: null, error: cause?.message || 'Could not read the linked campaign.' });
        }
      }
    };
    refresh();
    const stopRecovery = listenForRecovery(() => refresh(), { periodic: true });
    window.addEventListener(CAMPAIGN_BOARD_LINK_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      stopRecovery();
      window.removeEventListener(CAMPAIGN_BOARD_LINK_CHANGED_EVENT, refresh);
    };
  }, [active, boardId]);
  return active && state.boardId === boardId ? state : { campaign: null, error: null };
}
