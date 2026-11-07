import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  listHexCellRevisions,
  listHexCells,
  subscribeHexcrawl,
} from '../../../shared/cloud/api/hexcrawl.js';
import { hexCellsByKey } from '../../../shared/hexcrawl/hexCell.js';
import { listenForRecovery } from '../../../shared/cloud/sync/recoveryTriggers.js';
import { diffRevisions } from '../../../shared/cloud/sync/revisionDiff.js';

const EMPTY_CELLS = new Map();

// The hexes of this scene: read on mount, followed through Realtime, and
// recovered when a delivery was missed. `clockStamp` is the campaign clock's
// last write, which a player's list is re-read on (see below).
export function useHexCells({
  sceneId, visible, isGm, clockStamp, travelledColor, setError,
}) {
  const [cells, setCells] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!visible) {
      setCells([]);
      return () => { cancelled = true; };
    }
    listHexCells(sceneId)
      .then((rows) => { if (!cancelled) setCells(rows); })
      .catch((cause) => { if (!cancelled) setError(cause?.message || 'Could not read this map\'s hexes.'); });
    return () => { cancelled = true; };
  }, [sceneId, visible]);

  // A hex the GM takes back stops being readable by the players, and Realtime
  // cannot deliver a row the reader is no longer allowed to see: the update
  // simply never arrives and the old colour would sit there. So a player's list
  // is read again whenever the campaign clock moves, which is what every entry
  // and every un-visit of the party's own hex writes.
  useEffect(() => {
    let cancelled = false;
    if (!visible || isGm || !clockStamp) return () => { cancelled = true; };
    listHexCells(sceneId)
      .then((rows) => { if (!cancelled) setCells(rows); })
      .catch(() => { /* the map keeps the hexes it has */ });
    return () => { cancelled = true; };
  }, [clockStamp, isGm, sceneId, visible]);

  // Hex events Realtime missed are recovered like the scene's pieces: versions
  // first (a few bytes a hex), the list again only when one moved. On every
  // reconnect and on the shared triggers; map content, so also while hidden.
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    const keyOf = (cell) => `${cell.q}:${cell.r}`;
    const reconcileCells = async () => {
      let revisions;
      try {
        revisions = await listHexCellRevisions(sceneId);
      } catch (_) {
        return; // The next trigger tries again.
      }
      if (cancelled) return;
      const diff = diffRevisions(
        revisions.map((row) => ({ id: keyOf(row), version: row.updatedAt })),
        new Map(cellsRef.current.map((cell) => [keyOf(cell), cell.updatedAt])),
      );
      if (diff.clean) return;
      try {
        const rows = await listHexCells(sceneId);
        if (!cancelled) setCells(rows);
      } catch (_) { /* the map keeps the hexes it has */ }
    };
    const unsubscribe = subscribeHexcrawl({
      sceneId,
      onCell: ({ cell, removed }) => {
        if (!cell) return;
        setCells((current) => {
          const rest = current.filter((item) => !(item.q === cell.q && item.r === cell.r));
          return removed ? rest : [...rest, cell];
        });
      },
      // Like every synced view: each SUBSCRIBED (the first join too, which
      // closes the gap between the mount read and the subscription) checks
      // for what Realtime did not deliver.
      onStatus: (status) => { if (status === 'SUBSCRIBED') reconcileCells(); },
    });
    const stopRecovery = listenForRecovery(() => reconcileCells(), { periodic: true, whenHidden: true });
    return () => {
      cancelled = true;
      unsubscribe();
      stopRecovery();
    };
  }, [sceneId, visible]);

  // A player sees the country the party has been through, and nothing else: an
  // unrevealed hex the GM has already coloured in is the map they are making,
  // not the map the table is looking at.
  const cellsByKey = useMemo(() => {
    if (!visible) return EMPTY_CELLS;
    return hexCellsByKey(
      isGm ? cells : cells.filter((cell) => cell?.revealed),
      { travelledColor },
    );
  }, [cells, isGm, travelledColor, visible]);

  // A hex this browser just saved, put in place without waiting for Realtime.
  const storeCell = useCallback((saved) => {
    if (!saved) return;
    setCells((current) => [
      ...current.filter((item) => !(item.q === saved.q && item.r === saved.r)),
      saved,
    ]);
  }, []);

  return { cellsByKey, storeCell };
}
