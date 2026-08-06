import { useCallback, useEffect, useMemo, useState } from 'react';
import { readSceneDungeon, updateSceneDungeon } from '../../../shared/cloud/dungeon.js';
import {
  readCampaignHexcrawlBoard, readHexcrawlBoard,
} from '../../../shared/cloud/hexcrawl.js';
import { createDungeon } from '../../gmboard/logic/dungeon.js';
import { encounterBudget, fillBudget } from '../../../shared/dungeon/roomBudget.js';
import { crXP, getCR } from '../../encounterbuilder/logic/monsterUtils.js';
import { roomTokens } from '../../../shared/dungeon/roomPlacement.js';
import { roomMarkers } from '../../../shared/dungeon/roomMarkers.js';
import { seededRandom } from '../../../shared/dungeon/seededRandom.js';
import { createToken } from '../../../shared/cloud/vtt.js';

// The imported dungeon of a scene: its plan, what its rooms hold, and putting
// that on the board.
//
// The rolling is not reimplemented here — `createDungeon` is the GM Board's own
// engine, the same one that answers when a GM rolls a dungeon by hand, and it
// is fed the room count the imported plan actually has instead of a number
// typed into a box. What this hook adds is the two things the board cannot know:
// which room is which square of the map, and which creatures a rolled budget
// buys.

const EMPTY = Object.freeze({ plan: null, key: null, placed: {} });

export function useSceneDungeon({ scene, isGm, monsters, partySize }) {
  const sceneId = scene?.id || null;
  const campaignId = scene?.campaignId || null;
  const enabled = Boolean(isGm && sceneId);

  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setState(EMPTY);
      return () => { cancelled = true; };
    }
    setLoading(true);
    readSceneDungeon(sceneId)
      .then((row) => {
        if (cancelled) return;
        setState(row ? { plan: row.plan, key: row.key, placed: row.placed, origin: row.origin } : EMPTY);
      })
      .catch((cause) => { if (!cancelled) setError(cause?.message || 'Could not read this map\'s dungeon.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, sceneId]);

  // Priced once for the whole bestiary rather than per room: a dungeon is
  // twenty rooms and the table is three thousand creatures.
  //
  // The experience is added to the creature rather than wrapped around it. A
  // wrapper reached the token builder once and produced an ogre with one hit
  // point, a skeleton's portrait and a one-square footprint — every field it
  // read was on the monster inside.
  const priced = useMemo(() => (monsters || [])
    .map((monster) => ({ ...monster, xp: crXP(getCR(monster.cr)) }))
    .filter((entry) => entry.xp > 0), [monsters]);

  // The tables belong to the board this campaign was linked to, exactly as the
  // hexcrawl's do: the dungeon a GM rolls on the map and the one they roll on
  // the board come off the same page.
  const populate = useCallback(async ({ popMode = 'random', thr = 0, tier = 1 } = {}) => {
    if (!enabled || !state.plan?.rooms?.length) return null;
    setBusy(true);
    try {
      const boardId = campaignId ? await readCampaignHexcrawlBoard(campaignId) : null;
      const board = boardId ? await readHexcrawlBoard(boardId) : null;
      if (!board?.tables) {
        throw new Error('This campaign has no hexcrawl board linked, and the tables come from it.');
      }
      const rolled = createDungeon(
        { roomCount: state.plan.rooms.length, popMode, thr, tier },
        board.tables,
      );
      // The engine numbers its rooms from one, in order, which is how the plan
      // numbers its own: room three of the key is room three of the map.
      // An update rather than a write of the whole row: the plan is already
      // there and does not travel back and forth for every roll.
      const saved = await updateSceneDungeon(sceneId, { key: rolled, placed: {} });
      setState((current) => ({ ...current, key: saved.key, placed: saved.placed }));
      setError('');
      return saved.key;
    } catch (cause) {
      setError(cause?.message || 'Could not roll the dungeon.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [campaignId, enabled, sceneId, state.plan]);

  // What a room's encounter is worth, and what that buys.
  //
  // Seeded from the roll itself, so the answer is the same every time it is
  // asked. Drawn from Math.random it changed on every render — the panel showed
  // one set of creatures, the button placed another, and touching anything at
  // all shuffled both. The same key always buys the same monsters; rolling the
  // rooms again is what changes them.
  const monstersForRoom = useCallback((roomNumber) => {
    const keyRoom = state.key?.rooms?.[roomNumber - 1];
    if (!keyRoom) return null;
    const encounters = (keyRoom.slots || [])
      .map((slot) => slot.extra)
      .filter((extra) => extra?.kind === 'enc' && extra.data);
    if (!encounters.length) return null;
    const budget = encounters.reduce(
      (total, extra) => total + encounterBudget(extra.data, partySize),
      0,
    );
    const groups = fillBudget(priced, budget, seededRandom(`${state.key.id}:${roomNumber}`));
    return { budget, groups };
  }, [partySize, priced, state.key]);

  // Onto the board, in the room they were rolled for. The plan is in its own
  // cells and the map is in the scene's, so the two are joined by the origin
  // the import worked out when it laid the plan over the picture.
  const placeRoom = useCallback(async (roomNumber) => {
    if (!enabled) return null;
    const room = state.plan?.rooms?.find((item) => item.number === roomNumber);
    const keyRoom = state.key?.rooms?.[roomNumber - 1];
    if (!room || !keyRoom) return null;
    const chosen = monstersForRoom(roomNumber);
    const markers = roomMarkers(keyRoom);
    if (!chosen?.groups?.length && !markers.length) return null;

    setBusy(true);
    try {
      const laid = roomTokens({
        room,
        groups: chosen?.groups || [],
        markers,
        origin: state.origin || { col: 0, row: 0 },
      });
      const created = [];
      for (const token of laid) {
        created.push(await createToken(sceneId, token));
      }
      const placed = { ...state.placed, [room.id]: created.map((token) => token.id) };
      await updateSceneDungeon(sceneId, { placed });
      setState((current) => ({ ...current, placed }));
      setError('');
      return created;
    } catch (cause) {
      setError(cause?.message || 'Could not put that room on the map.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [enabled, monstersForRoom, sceneId, state.key, state.origin, state.placed, state.plan]);

  // What a room would put on the board, for the panel to offer before it does.
  const markersForRoom = useCallback(
    (roomNumber) => roomMarkers(state.key?.rooms?.[roomNumber - 1]),
    [state.key],
  );

  return {
    enabled: enabled && Boolean(state.plan),
    loading,
    busy,
    error,
    plan: state.plan,
    key: state.key,
    placed: state.placed,
    populate,
    monstersForRoom,
    markersForRoom,
    placeRoom,
  };
}
