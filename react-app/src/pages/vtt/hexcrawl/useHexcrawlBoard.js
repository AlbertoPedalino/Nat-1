import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  readCampaignHexcrawlBoard,
  readHexcrawlBoard,
  readHexcrawlBoardVersion,
} from '../../../shared/cloud/api/hexcrawl.js';
import { watchRevisions } from '../../../shared/cloud/sync/recoveryTriggers.js';
import { syncKeys } from '../../../shared/cloud/sync/syncKeys.js';

// The board whose tables the map's rolls come from, followed for as long as
// this browser may run the crawl.
//
// The tables come from the board this campaign was linked to, which is the
// pointer the database keeps — not from whatever board this browser happens to
// have open. A lightweight version check keeps an already-open VTT current
// when the board is edited in another tool or on another device. Every roll
// also forces one fresh read, so it can never use stale custom tables between
// two polling ticks.
export function useHexcrawlBoard({ campaignId, enabled }) {
  const [board, setBoard] = useState(null);
  const boardRef = useRef(null);
  const boardScopeRef = useRef(enabled && campaignId ? campaignId : null);
  const boardRefreshQueueRef = useRef(Promise.resolve(null));

  const refreshBoard = useCallback(({ force = false } = {}) => {
    const refresh = async () => {
      const scope = enabled && campaignId ? campaignId : null;
      if (!scope || scope !== boardScopeRef.current) return null;
      const boardId = await readCampaignHexcrawlBoard(campaignId);
      if (scope !== boardScopeRef.current) return boardRef.current;
      if (!boardId) {
        boardRef.current = null;
        setBoard(null);
        return null;
      }
      const current = boardRef.current;
      if (!force && current?.id === boardId) {
        const version = await readHexcrawlBoardVersion(boardId);
        if (scope !== boardScopeRef.current) return boardRef.current;
        if (version === current.version) return current;
      }
      const loaded = await readHexcrawlBoard(boardId);
      if (scope !== boardScopeRef.current) return boardRef.current;
      boardRef.current = loaded;
      setBoard(loaded);
      return loaded;
    };
    const queued = boardRefreshQueueRef.current.catch(() => null).then(refresh);
    boardRefreshQueueRef.current = queued;
    return queued;
  }, [campaignId, enabled]);

  useEffect(() => {
    const scope = enabled && campaignId ? campaignId : null;
    boardScopeRef.current = scope;
    boardRef.current = null;
    setBoard(null);
    if (!scope) {
      return undefined;
    }
    let cancelled = false;
    refreshBoard().catch(() => {
      if (!cancelled && !boardRef.current) setBoard(null);
    });
    return () => {
      cancelled = true;
      if (boardScopeRef.current === scope) boardScopeRef.current = null;
    };
  }, [refreshBoard]);

  // Another device relinking the campaign's board or saving the board. Map
  // content: followed in a background tab too, like the scene.
  const boardId = board?.id || null;
  useEffect(() => {
    if (!enabled || !campaignId) return undefined;
    return watchRevisions(
      [syncKeys.campaign(campaignId), boardId && syncKeys.instance('boards', boardId)],
      () => refreshBoard().then(() => true, () => false),
      { whenHidden: true },
    );
  }, [boardId, campaignId, enabled, refreshBoard]);

  return { board, refreshBoard };
}
