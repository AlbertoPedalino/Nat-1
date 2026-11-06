import { useMemo, useState } from 'react';
import { mergeBoardClock, travelFromState } from '../../../shared/hexcrawl/hexEntry.js';
import { useCampaignClock } from '../../../shared/hexcrawl/useCampaignClock.js';
import { hexKey, isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import { useHexcrawlBoard } from './useHexcrawlBoard.js';
import { useHexCells } from './useHexCells.js';
import { useHexVisit } from './useHexVisit.js';
import { useHexcrawlClockControls } from './useHexcrawlClockControls.js';

// The map's half of the hexcrawl: the hexes of this scene, the campaign's clock,
// and the board whose tables the rolls come from.
//
// The engine is not reimplemented here — `runHexEntry` calls the GM Board's own
// resolver. This hook only decides what to feed it and where the answer is
// written: the hex row, the clock row, the log table.

export function useSceneHexcrawl({ scene, isGm }) {
  const campaignId = scene?.campaignId || null;
  const sceneId = scene?.id || null;
  // Two different questions. `visible` is whether this map has hexes worth
  // painting at all — a player and the projector need the colours and the party
  // marker as much as the GM does, since that is the map everyone is reading.
  // `enabled` is whether this browser may *run* the crawl, which is the GM's.
  const visible = Boolean(sceneId && isHexGrid(scene?.grid));
  const enabled = Boolean(isGm && visible);

  // Shared by every write below: one crawl, one spinner, one last error.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // The log is the GM's notes and the database says so: a player asking for it
  // is refused, and the refusal used to take the clock down with it — both reads
  // are one `Promise.all`, so a player loaded no clock at all and stood on a map
  // with no party marker until the GM next moved.
  // Only a hex map shows the party or runs travel, so a square scene leaves the
  // campaign clock alone instead of keeping a poll and a channel open for it.
  const clock = useCampaignClock(visible ? campaignId : null, { withLog: isGm });
  const { board, refreshBoard } = useHexcrawlBoard({ campaignId, enabled });
  const travel = travelFromState(mergeBoardClock(board?.state || {}, clock.clock));
  const defaults = {
    terrain: travel.terrain, pop: travel.pop, tier: travel.hexTier, mountSpeed: travel.mountSpeed,
  };

  const { cellsByKey, storeCell } = useHexCells({
    sceneId,
    visible,
    isGm,
    clockStamp: clock.clock?.updatedAt || 0,
    travelledColor: scene?.grid?.hexColor || null,
    setError,
  });
  const visit = useHexVisit({
    sceneId, enabled, clock, refreshBoard, cellsByKey, storeCell, setBusy, setError,
  });
  const {
    setDefaults, setSeason, setClock, advanceClock,
  } = useHexcrawlClockControls({
    enabled, clock, refreshBoard, setBusy, setError,
  });
  const { lastVisit } = visit;

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
    selected: visit.selected,
    clickHex: visit.clickHex,
    armed: visit.armed,
    setArmed: visit.setArmed,
    defaults,
    setDefaults,
    setSeason,
    setClock,
    advanceClock,
    board,
    clock: clock.clock,
    log: clock.log,
    clockLinked: clock.active,
    bubble: visit.bubble,
    dismissBubble: visit.dismissBubble,
    lastHex,
    hasResult: visit.hasResult,
    result: visit.result,
    openResult: visit.openResult,
    dismissResult: visit.dismissResult,
    busy,
    error: error || clock.error,
  };
}
