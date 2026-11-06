import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { saveHexCell } from '../../../shared/cloud/api/hexcrawl.js';
import { hexEntrySummary, mergeBoardClock, runHexEntry } from '../../../shared/hexcrawl/hexEntry.js';
import { hexKey } from '../../../shared/vtt/map/hexGeometry.js';

// Long enough to read three lines and decide whether to open the rolls, short
// enough that a bubble is never still sitting on the map two hexes later.
const BUBBLE_MS = 12000;

// The party's walk across the map: the hex picked, entering it (the roll, the
// clock, the hex row), taking a visit back, and the bubble, panel record and
// dialog that report what happened.
export function useHexVisit({
  sceneId, enabled, clock, refreshBoard, cellsByKey, storeCell, setBusy, setError,
}) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  // The bubble is the answer; the dialog is the working behind it, opened only
  // when the GM asks for it. Walking a party across a map is a dozen small
  // answers, and a modal for each one is what makes that feel like paperwork.
  const [bubble, setBubble] = useState(null);
  // Outlives the bubble: the panel's record of where the party last walked.
  const [lastVisit, setLastVisit] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);
  const bubbleTimerRef = useRef(null);
  // Armed, a click walks the party in and rolls. Disarmed it only picks the hex,
  // which is what setting a map up wants — otherwise laying out terrain would
  // burn a day of travel per click.
  const [armed, setArmed] = useState(true);
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

  return {
    selected,
    clickHex,
    armed,
    setArmed,
    bubble,
    dismissBubble: () => {
      clearTimeout(bubbleTimerRef.current);
      setBubble(null);
    },
    lastVisit,
    // Whether there are rolls to go back to: the panel offers the dialog only
    // for a hex this browser rolled.
    hasResult: Boolean(result),
    // The dialog is only ever open because somebody opened it.
    result: resultOpen ? result : null,
    openResult: () => setResultOpen(Boolean(result)),
    dismissResult: () => setResultOpen(false),
  };
}
