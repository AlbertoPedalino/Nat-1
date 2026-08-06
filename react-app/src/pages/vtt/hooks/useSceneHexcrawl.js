import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  listHexCells,
  readCampaignHexcrawlBoard,
  readHexcrawlBoard,
  saveHexCell,
  subscribeHexcrawl,
} from '../../../shared/cloud/hexcrawl.js';
import { hexCellsByKey } from '../../../shared/hexcrawl/hexCell.js';
import {
  clockFromState, hexEntrySummary, mergeBoardClock, runHexEntry,
} from '../../../shared/hexcrawl/hexEntry.js';
import { useCampaignClock } from '../../../shared/hexcrawl/useCampaignClock.js';
import { hexKey, isHexGrid } from '../../../shared/vtt/hexGeometry.js';

// The map's half of the hexcrawl: the hexes of this scene, the campaign's clock,
// and the board whose tables the rolls come from.
//
// The engine is not reimplemented here — `runHexEntry` calls the GM Board's own
// resolver. This hook only decides what to feed it and where the answer is
// written: the hex row, the clock row, the log table.

const EMPTY_CELLS = new Map();
// What a freshly clicked hex is assumed to be. A wilderness map is mostly one
// kind of country, so setting it once and clicking is the whole point; a hex
// that already has its own terrain keeps it.
const DEFAULTS_KEY = 'gb:hexcrawl:defaults:';
// Long enough to read three lines and decide whether to open the rolls, short
// enough that a bubble is never still sitting on the map two hexes later.
const BUBBLE_MS = 12000;
const EMPTY_DEFAULTS = Object.freeze({ terrain: null, pop: null, tier: null });

function readDefaults(sceneId) {
  if (!sceneId) return { ...EMPTY_DEFAULTS };
  try {
    const raw = localStorage.getItem(`${DEFAULTS_KEY}${sceneId}`);
    return raw ? { ...EMPTY_DEFAULTS, ...JSON.parse(raw) } : { ...EMPTY_DEFAULTS };
  } catch {
    return { ...EMPTY_DEFAULTS };
  }
}

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
  const [defaults, setDefaultsState] = useState(() => readDefaults(sceneId));
  // Armed, a click walks the party in and rolls. Disarmed it only picks the hex,
  // which is what setting a map up wants — otherwise laying out terrain would
  // burn a day of travel per click.
  const [armed, setArmed] = useState(true);
  // The log is the GM's notes and the database says so: a player asking for it
  // is refused, and the refusal used to take the clock down with it — both reads
  // are one `Promise.all`, so a player loaded no clock at all and stood on a map
  // with no party marker until the GM next moved.
  const clock = useCampaignClock(campaignId, { withLog: isGm });
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
    setDefaultsState(readDefaults(sceneId));
  }, [sceneId]);

  useEffect(() => () => clearTimeout(bubbleTimerRef.current), []);

  const setDefaults = useCallback((patch) => {
    setDefaultsState((current) => {
      const next = { ...current, ...patch };
      try {
        if (sceneId) localStorage.setItem(`${DEFAULTS_KEY}${sceneId}`, JSON.stringify(next));
      } catch (_) { /* a browser with no storage still gets the session's defaults */ }
      return next;
    });
  }, [sceneId]);

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
  // have open.
  useEffect(() => {
    let cancelled = false;
    if (!enabled || !campaignId) {
      setBoard(null);
      return () => { cancelled = true; };
    }
    readCampaignHexcrawlBoard(campaignId)
      .then((boardId) => (boardId ? readHexcrawlBoard(boardId) : null))
      .then((loaded) => { if (!cancelled) setBoard(loaded); })
      .catch(() => { if (!cancelled) setBoard(null); });
    return () => { cancelled = true; };
  }, [campaignId, enabled]);

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
  const cellsByKey = useMemo(() => {
    if (!visible) return EMPTY_CELLS;
    return hexCellsByKey(isGm ? cells : cells.filter((cell) => cell?.revealed));
  }, [cells, isGm, visible]);

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
    if (!board) {
      setError('This campaign has no hexcrawl board linked. Link one from the GM Board.');
      return null;
    }
    setBusy(true);
    try {
      // An untouched hex takes the map's defaults, and keeps them: after this it
      // is a hex with a terrain, not one that happened to be rolled as forest.
      const filled = {
        ...hex,
        terrain: hex.terrain || defaults.terrain,
        pop: hex.pop || defaults.pop,
        tier: hex.tier ?? defaults.tier,
      };
      const boardState = mergeBoardClock(board.state, clock.clock);
      const entry = runHexEntry({
        board: boardState, hex: filled, tables: board.tables, mode,
      });
      setResult({ ...entry.result, hex: filled, clock: entry.clock });
      const summary = hexEntrySummary(entry.result);
      const spoken = {
        id: `${filled.q}:${filled.r}:${Date.now()}`,
        hex: filled,
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
  }, [board, clock, defaults, enabled, sceneId, storeCell]);

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
    if (!clock.active) return null;
    const base = mergeBoardClock(board?.state || {}, clock.clock);
    try {
      const saved = await clock.saveClock({ ...clockFromState(base), season: season || null });
      setError(null);
      return saved;
    } catch (cause) {
      setError(cause?.message || 'Could not set the season.');
      return null;
    }
  }, [board, clock]);

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
