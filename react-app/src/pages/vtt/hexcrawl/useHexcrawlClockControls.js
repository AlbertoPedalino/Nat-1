import { useCallback } from 'react';
import {
  clockFromResult, clockSeedPatch, mergeBoardClock,
} from '../../../shared/hexcrawl/hexEntry.js';
import { resolveManualAdvance } from '../../../shared/hexcrawl/hexRules.js';
import { runBusy } from '../../../shared/ui/busyAction.js';

// The campaign clock written by hand from the map: the travel defaults, the
// season, the date and sky, and hours passed off the map. Each write reads the
// linked board fresh, so the first save carries the board's own time.
export function useHexcrawlClockControls({
  enabled, clock, refreshBoard, setBusy, setError,
}) {
  const setDefaults = useCallback(async (patch) => {
    if (!enabled || !clock.active) return null;
    return runBusy({ setBusy, report: setError }, async () => {
      const activeBoard = await refreshBoard({ force: true });
      if (!activeBoard) throw new Error('This campaign has no hexcrawl board linked.');
      const fields = {};
      for (const key of ['terrain', 'pop', 'mountSpeed']) {
        if (patch[key] !== undefined) fields[key] = patch[key];
      }
      if (patch.tier !== undefined) fields.hexTier = patch.tier;
      const saved = await clock.saveClock((current) => {
        const base = mergeBoardClock(activeBoard.state, current);
        return { ...clockSeedPatch(current, base), ...fields };
      });
      setError(null);
      return saved;
    }, 'Could not save the hexcrawl settings.');
  }, [clock, enabled, refreshBoard]);

  // The season, the date and the sky belong to the campaign once there is one:
  // both screens read them from the same row. Written with the rest of the clock
  // so the first save carries the board's own time rather than the schema's
  // defaults. `patch` may be a function of the merged state, resolved when the
  // queued write runs, so it builds on whatever the write before it saved.
  const patchClock = useCallback(async (patch, failure) => {
    if (!enabled || !clock.active) return null;
    return runBusy({ setBusy, report: setError }, async () => {
      const activeBoard = await refreshBoard({ force: true });
      if (!activeBoard) throw new Error('This campaign has no hexcrawl board linked.');
      const saved = await clock.saveClock((current) => {
        const base = mergeBoardClock(activeBoard.state, current);
        return { ...clockSeedPatch(current, base), ...(typeof patch === 'function' ? patch(base, activeBoard) : patch) };
      });
      setError(null);
      return saved;
    }, failure);
  }, [clock, enabled, refreshBoard]);

  const setSeason = useCallback(
    (season) => patchClock({ season: season || null }, 'Could not set the season.'),
    [patchClock],
  );

  // Date, time of day or the sky, set by hand: the GM Board's Date & Time and
  // weather override, for a table that is running the crawl from the map.
  const setClock = useCallback(
    (fields) => patchClock(fields, 'Could not change the campaign clock.'),
    [patchClock],
  );

  // Hours that pass off the map — a rest, a siege, a day in town. The weather
  // keeps its own count through them, exactly as it does on the board.
  const advanceClock = useCallback((hours) => {
    const amount = Number(hours);
    if (!Number.isFinite(amount) || amount <= 0) return Promise.resolve(null);
    return patchClock((base, activeBoard) => {
      const advanced = resolveManualAdvance(base, amount, activeBoard.tables);
      return { ...clockFromResult(advanced), season: base.season || null };
    }, 'Could not advance the campaign clock.');
  }, [patchClock]);

  return {
    setDefaults, setSeason, setClock, advanceClock,
  };
}
