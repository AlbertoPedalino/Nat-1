import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  listHexCellRevisions,
  listHexCells,
  listHexCellsAt,
  subscribeHexcrawl,
} from '../../../shared/cloud/api/hexcrawl.js';
import { hexCellsByKey } from '../../../shared/hexcrawl/hexCell.js';
import { watchRevisions } from '../../../shared/cloud/sync/recoveryTriggers.js';
import { syncKeys } from '../../../shared/cloud/sync/syncKeys.js';
import { assembleSnapshot, diffRevisions, readChanged } from '../../../shared/cloud/sync/revisionDiff.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';

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
      .catch((cause) => { if (!cancelled) setError(failureMessage("Could not read this map's hexes.", cause)); });
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
  // first (a few bytes a hex), then only the hexes that moved. On every
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
        return false; // The next trigger tries again.
      }
      if (cancelled) return true;
      const held = new Map(cellsRef.current.map((cell) => [keyOf(cell), cell]));
      const diff = diffRevisions(
        revisions.map((row) => ({ id: keyOf(row), version: row.updatedAt })),
        new Map([...held].map(([key, cell]) => [key, cell.updatedAt])),
      );
      if (diff.clean) return true;
      let rows;
      try {
        rows = await readChanged(diff, {
          fetchAll: () => listHexCells(sceneId),
          fetchSome: (coordinates) => listHexCellsAt(sceneId, coordinates),
        });
      } catch (_) {
        return false; // The map keeps the hexes it has.
      }
      if (!cancelled) setCells(assembleSnapshot(diff.ids, diff.changed, rows, held, keyOf));
      return true;
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
    const stopRecovery = watchRevisions([syncKeys.hexCells(sceneId)], () => reconcileCells(), { whenHidden: true });
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
