import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  listHexCells,
  readCampaignHexcrawlBoard,
  readHexcrawlBoard,
  readHexcrawlBoardVersion,
  saveHexCell,
  subscribeHexcrawl,
} from '../../../shared/cloud/api/hexcrawl.js';
import { hexCellsByKey } from '../../../shared/hexcrawl/hexCell.js';
import {
  clockFromState, hexEntrySummary, mergeBoardClock, runHexEntry, travelFromState,
} from '../../../shared/hexcrawl/hexEntry.js';
import { useCampaignClock } from '../../../shared/hexcrawl/useCampaignClock.js';
import { hexKey, isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';

// The map's half of the hexcrawl: the hexes of this scene, the campaign's clock,
// and the board whose tables the rolls come from.
//
// The engine is not reimplemented here — `runHexEntry` calls the GM Board's own
// resolver. This hook only decides what to feed it and where the answer is
// written: the hex row, the clock row, the log table.

const EMPTY_CELLS = new Map();
// Long enough to read three lines and decide whether to open the rolls, short
// enough that a bubble is never still sitting on the map two hexes later.
const BUBBLE_MS = 12000;
// A safety net only: focus re-reads at once, every roll forces a fresh read,
// and the check itself is a version number before any board download.
export const BOARD_REFRESH_MS = 30_000;

export function useSceneHexcrawl({ scene, isGm }) {
  const campaignId = scene?.campaignId || null;
  const sceneId = scene?.id || null;
  // Two different questions. `visible` is whether this map has hexes worth
  // painting at all — a player and the projector need the colours and the party
  // marker as much as the GM does, since that is the map everyone is reading.
  // `enabled` is whether this browser may *run* the crawl, which is the GM's.
  const visible = Boolean(sceneId && isHexGrid(scene?.grid));
  const enabled = Boolean(isGm && visible);

  const [cells, setCells] = useState([]);
  const [selected, setSelected] = useState(null);
  const [board, setBoard] = useState(null);
  const boardRef = useRef(null);
  const boardScopeRef = useRef(enabled && campaignId ? campaignId : null);
  const boardRefreshQueueRef = useRef(Promise.resolve(null));
  const [result, setResult] = useState(null);
  // The bubble is the answer; the dialog is the working behind it, opened only
  // when the GM asks for it. Walking a party across a map is a dozen small
  // answers, and a modal for each one is what makes that feel like paperwork.
  const [bubble, setBubble] = useState(null);
  // Outlives the bubble: the panel's record of where the party last walked.
  const [lastVisit, setLastVisit] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);
  const bubbleTimerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Armed, a click walks the party in and rolls. Disarmed it only picks the hex,
  // which is what setting a map up wants — otherwise laying out terrain would
  // burn a day of travel per click.
  const [armed, setArmed] = useState(true);
  // The log is the GM's notes and the database says so: a player asking for it
  // is refused, and the refusal used to take the clock down with it — both reads
  // are one `Promise.all`, so a player loaded no clock at all and stood on a map
  // with no party marker until the GM next moved.
  // Only a hex map shows the party or runs travel, so a square scene leaves the
  // campaign clock alone instead of keeping a poll and a channel open for it.
  const clock = useCampaignClock(visible ? campaignId : null, { withLog: isGm });
  const travel = travelFromState(mergeBoardClock(board?.state || {}, clock.clock));
  const defaults = {
    terrain: travel.terrain, pop: travel.pop, tier: travel.hexTier, mountSpeed: travel.mountSpeed,
  };
  // Cleared whenever the scene changes: a result belongs to the hex it was
  // rolled on, and that hex is not on the next map.
  const sceneRef = useRef(sceneId);

  useEffect(() => {
    if (sceneRef.current === sceneId) return;
    sceneRef.current = sceneId;
    setSelected(null);
    setResult(null);
    setBubble(null);
    setLastVisit(null);
    setResultOpen(false);
  }, [sceneId]);

  useEffect(() => () => clearTimeout(bubbleTimerRef.current), []);

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
  const clockStamp = clock.clock?.updatedAt || 0;
  useEffect(() => {
    let cancelled = false;
    if (!visible || isGm || !clockStamp) return () => { cancelled = true; };
    listHexCells(sceneId)
      .then((rows) => { if (!cancelled) setCells(rows); })
      .catch(() => { /* the map keeps the hexes it has */ });
    return () => { cancelled = true; };
  }, [clockStamp, isGm, sceneId, visible]);

  // The tables come from the board this campaign was linked to, which is the
  // pointer the database keeps — not from whatever board this browser happens to
  // have open. A lightweight version check keeps an already-open VTT current
  // when the board is edited in another tool or on another device. Every roll
  // also forces one fresh read, so it can never use stale custom tables between
  // two polling ticks.
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
        const updatedAt = await readHexcrawlBoardVersion(boardId);
        if (scope !== boardScopeRef.current) return boardRef.current;
        if (updatedAt <= current.updatedAt) return current;
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

  const setDefaults = useCallback(async (patch) => {
    if (!enabled || !clock.active) return null;
    setBusy(true);
    try {
      const activeBoard = await refreshBoard({ force: true });
      if (!activeBoard) throw new Error('This campaign has no hexcrawl board linked.');
      const fields = {};
      for (const key of ['terrain', 'pop', 'mountSpeed']) {
        if (patch[key] !== undefined) fields[key] = patch[key];
      }
      if (patch.tier !== undefined) fields.hexTier = patch.tier;
      const saved = await clock.saveClock((current) => {
        const base = mergeBoardClock(activeBoard.state, current);
        return {
          ...(!current ? clockFromState(base) : {}),
          ...(!current?.travelConfigured
            ? { ...travelFromState(base), travelConfigured: true, season: base.season || null } : {}),
          ...fields,
        };
      });
      setError(null);
      return saved;
    } catch (cause) {
      setError(cause?.message || 'Could not save the hexcrawl settings.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [clock, enabled, refreshBoard]);

  useEffect(() => {
    const scope = enabled && campaignId ? campaignId : null;
    boardScopeRef.current = scope;
    boardRef.current = null;
    setBoard(null);
    if (!scope) {
      return undefined;
    }
    let cancelled = false;
    const refresh = () => refreshBoard().catch(() => {
      if (!cancelled && !boardRef.current) setBoard(null);
    });
    refresh();
    const timer = setInterval(refresh, BOARD_REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      if (boardScopeRef.current === scope) boardScopeRef.current = null;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshBoard]);

  useEffect(() => {
    if (!visible) return undefined;
    return subscribeHexcrawl({
      sceneId,
      onCell: ({ cell, removed }) => {
        if (!cell) return;
        setCells((current) => {
          const rest = current.filter((item) => !(item.q === cell.q && item.r === cell.r));
          return removed ? rest : [...rest, cell];
        });
      },
    });
  }, [sceneId, visible]);

  // A player sees the country the party has been through, and nothing else: an
  // unrevealed hex the GM has already coloured in is the map they are making,
  // not the map the table is looking at.
  const travelledColor = scene?.grid?.hexColor || null;
  const cellsByKey = useMemo(() => {
    if (!visible) return EMPTY_CELLS;
    return hexCellsByKey(
      isGm ? cells : cells.filter((cell) => cell?.revealed),
      { travelledColor },
    );
  }, [cells, isGm, travelledColor, visible]);

  const storeCell = useCallback((saved) => {
    if (!saved) return;
    setCells((current) => [
      ...current.filter((item) => !(item.q === saved.q && item.r === saved.r)),
      saved,
    ]);
  }, []);

  // Walking into a hex. The board supplies the tables and the season; the
  // campaign row supplies the time of day and the weather, so a hex entered from
  // the map and one entered from the board move the same clock.
  //
  // The hex is passed in rather than read from state: a click has to roll for
  // the hex that was clicked, not for whichever one a render has caught up with.
  const enterHexAt = useCallback(async (hex, mode = 'proceed') => {
    if (!enabled || !hex) return null;
    setBusy(true);
    try {
      const activeBoard = await refreshBoard({ force: true });
      if (!activeBoard) {
        throw new Error('This campaign has no hexcrawl board linked. Link one from the GM Board.');
      }
      // An untouched hex takes the map's defaults, and keeps them: after this it
      // is a hex with a terrain, not one that happened to be rolled as forest.
      const merged = mergeBoardClock(activeBoard.state, clock.clock);
      const filled = {
        ...hex,
        terrain: hex.terrain || merged.terrain,
        pop: hex.pop || merged.pop,
        tier: hex.tier ?? merged.hexTier,
      };
      // Both screens use the campaign's travel speed, falling back to the
      // linked board for campaigns that have not configured shared travel yet.
      const boardState = {
        ...merged,
        mountSpeed: merged.mountSpeed ?? 1,
      };
      const entry = runHexEntry({
        board: boardState, hex: filled, tables: activeBoard.tables, mode,
      });
      setResult({ ...entry.result, hex: filled, clock: entry.clock });
      const summary = hexEntrySummary(entry.result);
      const spoken = {
        id: `${filled.q}:${filled.r}:${Date.now()}`,
        hex: filled,
        // The hours the leg cost, so the bubble is not still quoting the
        // terrain's own while the party rides.
        travelHours: entry.result.travelHours,
        // The clock as it is *after* the leg: the bubble reports the hour the
        // party arrived and the sky they arrived under, not the ones they left.
        clock: { ...entry.clock, season: boardState.season || null },
        ...summary,
      };
      setBubble(spoken);
      // The bubble fades; what it said does not. The panel keeps the last hex so
      // a GM who looked away still knows where the party is and what happened.
      setLastVisit({
        ...spoken, at: Date.now(), fromThisSession: true, onThisScene: true,
      });
      clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => setBubble(null), BUBBLE_MS);
      await clock.saveClock(
        {
          ...entry.clock,
          season: boardState.season || null,
          party: { q: filled.q, r: filled.r },
          sceneId,
        },
        { logEntry: entry.result.logEntry },
      );
      // Entering a hex is what makes it travelled, and what the party has walked
      // through is not a secret from them.
      const saved = await saveHexCell(sceneId, filled, {
        terrain: filled.terrain,
        pop: filled.pop,
        tier: filled.tier,
        status: filled.status === 'unexplored' ? 'travelled' : filled.status,
        revealed: true,
      });
      storeCell(saved);
      setError(null);
      return entry.result;
    } catch (cause) {
      setError(cause?.message || 'Could not enter that hex.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [clock, enabled, refreshBoard, sceneId, storeCell]);

  // Taking a hex back. The terrain, population and tier stay — those are what
  // the hex *is*, and re-entering it should not mean setting it up again. What
  // is undone is the visit: its colour, and the players' sight of it.
  //
  // No clock is rewound. Hours the table has already played through are not the
  // map's to give back, and pretending otherwise would put the party's own
  // record of the day at odds with the campaign's.
  const clearHexAt = useCallback(async (cell) => {
    if (!enabled || !cell) return null;
    setBusy(true);
    try {
      const saved = await saveHexCell(sceneId, cell, { status: 'unexplored', revealed: false });
      storeCell(saved);
      const isLast = lastVisit && lastVisit.hex.q === cell.q && lastVisit.hex.r === cell.r;
      setBubble((current) => (
        current && current.hex.q === cell.q && current.hex.r === cell.r ? null : current
      ));
      if (isLast) {
        // The marker stood on this hex; with the visit gone there is nowhere for
        // it to stand, and the rolls behind it describe a leg that no longer
        // happened as far as the map is concerned.
        setLastVisit(null);
        setResult(null);
        setResultOpen(false);
        if (clock.active) await clock.saveClock({ party: null, sceneId });
      }
      setError(null);
      return saved;
    } catch (cause) {
      setError(cause?.message || 'Could not clear that hex.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [clock, enabled, lastVisit, sceneId, storeCell]);

  // What a click on the board does: pick the hex, and — while the crawl is
  // armed — walk into it and roll. A hex the party has already been through is
  // the exception: clicking that one takes the visit back rather than spending
  // another day of travel on ground the GM only meant to un-mark.
  const clickHex = useCallback((cell) => {
    setSelected(cell);
    if (!armed) return;
    const stored = cellsByKey.get(hexKey(cell));
    if (stored && stored.status !== 'unexplored') {
      clearHexAt(stored);
      return;
    }
    enterHexAt(stored || {
      q: cell.q, r: cell.r, status: 'unexplored', revealed: false, note: '',
    });
  }, [armed, cellsByKey, clearHexAt, enterHexAt]);

  // The season belongs to the campaign once there is one: both screens read it
  // from the same row. Written with the rest of the clock so the first save
  // carries the board's own time rather than the schema's defaults.
  const setSeason = useCallback(async (season) => {
    if (!enabled || !clock.active) return null;
    setBusy(true);
    try {
      const activeBoard = await refreshBoard({ force: true });
      if (!activeBoard) throw new Error('This campaign has no hexcrawl board linked.');
      const base = mergeBoardClock(activeBoard.state, clock.clock);
      const saved = await clock.saveClock((current) => ({
        ...(!current ? clockFromState(base) : {}),
        ...(!current?.travelConfigured ? { ...travelFromState(base), travelConfigured: true } : {}),
        season: season || null,
      }));
      setError(null);
      return saved;
    } catch (cause) {
      setError(cause?.message || 'Could not set the season.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [clock, enabled, refreshBoard]);

  // Where the party stands, said as fully as this browser can say it. A hex
  // entered in this session carries its whole answer; one entered from the GM
  // Board, or before this tab was opened, is still worth showing — the campaign
  // row remembers the coordinates and the clock even when nobody here rolled.
  const lastHex = useMemo(() => {
    if (lastVisit) return lastVisit;
    const party = clock.clock?.party;
    if (!party) return null;
    const cell = cellsByKey.get(hexKey(party));
    return {
      hex: { ...party, terrain: cell?.terrain || null },
      clock: clock.clock,
      headline: null,
      lines: [],
      fromThisSession: false,
      // The clock names the scene the party was last moved on: another map's
      // hex 3,-2 is not this map's.
      onThisScene: !clock.clock.sceneId || clock.clock.sceneId === sceneId,
    };
  }, [cellsByKey, clock.clock, lastVisit, sceneId]);

  // Where the marker goes. Read from the campaign row rather than from this
  // session's own last entry, so a player, the projector and a GM who has just
  // reloaded all put the party in the same hex.
  const partyHex = useMemo(() => {
    if (!visible) return null;
    const party = clock.clock?.party;
    if (!party) return null;
    const onThisScene = !clock.clock.sceneId || clock.clock.sceneId === sceneId;
    return onThisScene ? { q: party.q, r: party.r } : null;
  }, [clock.clock, sceneId, visible]);

  return {
    enabled,
    visible,
    partyHex,
    cellsByKey,
    selected,
    clickHex,
    armed,
    setArmed,
    defaults,
    setDefaults,
    setSeason,
    board,
    clock: clock.clock,
    log: clock.log,
    clockLinked: clock.active,
    bubble,
    lastHex,
    // Whether there are rolls to go back to: the panel offers the dialog only
    // for a hex this browser rolled.
    hasResult: Boolean(result),
    // The dialog is only ever open because somebody opened it.
    result: resultOpen ? result : null,
    openResult: () => setResultOpen(Boolean(result)),
    dismissResult: () => setResultOpen(false),
    busy,
    error: error || clock.error,
  };
}
