import { useEffect, useState } from 'react';
import { useAuth } from '../cloud/auth/AuthProvider.jsx';
import { readHexcrawlBoardCampaign } from '../cloud/api/hexcrawl.js';

// The board-campaign link changes rarely and local changes announce
// themselves; the timer only catches another device's edit.
const LINK_REFRESH_MS = 30_000;

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
    const timer = setInterval(refresh, LINK_REFRESH_MS);
    window.addEventListener('focus', refresh);
    window.addEventListener('gb:campaign-board-link-changed', refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('gb:campaign-board-link-changed', refresh);
    };
  }, [active, boardId]);
  return active && state.boardId === boardId ? state : { campaign: null, error: null };
}
