import { useCallback, useEffect, useMemo, useState } from 'react';
import { readSceneDungeon, updateSceneDungeon } from '../../../shared/cloud/dungeon.js';
import {
  readCampaignHexcrawlBoard, readHexcrawlBoard,
} from '../../../shared/cloud/hexcrawl.js';
import { createDungeon } from '../../gmboard/logic/dungeon.js';
import { encounterBudget, fillBudget } from '../../../shared/dungeon/roomBudget.js';
import { crXP, getCR } from '../../encounterbuilder/logic/monsterUtils.js';
import { layoutTokens, monsterGroupTokens } from '../../../shared/vtt/encounterImport.js';
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
  const priced = useMemo(() => (monsters || [])
    .map((monster) => ({ monster, name: monster.name, xp: crXP(getCR(monster.cr)) }))
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

  // What a room's encounter is worth, and what that buys. Answered before
  // anything is placed so the GM can see it and roll again if they hate it.
  const monstersForRoom = useCallback((roomNumber, rng = Math.random) => {
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
    const groups = fillBudget(priced, budget, rng);
    return { budget, groups };
  }, [partySize, priced, state.key]);

  // Onto the board, in the room they were rolled for. The plan is in its own
  // cells and the map is in the scene's, so the two are joined by the origin
  // the import worked out when it laid the plan over the picture.
  const placeRoom = useCallback(async (roomNumber, { layer = 'gm' } = {}) => {
    if (!enabled) return null;
    const room = state.plan?.rooms?.find((item) => item.number === roomNumber);
    const chosen = monstersForRoom(roomNumber);
    if (!room || !chosen?.groups?.length) return null;

    setBusy(true);
    try {
      const origin = state.origin || { col: 0, row: 0 };
      const tokens = chosen.groups.flatMap(({ monster, count }) => (
        monsterGroupTokens(monster, count, { layer })
      ));
      // Laid out from the room's own corner, one cell in, so a wide creature
      // does not hang through a wall.
      const laid = layoutTokens(tokens, [], {
        columns: Math.max(1, room.w - 1),
        origin: { x: origin.col + room.x, y: origin.row + room.y },
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
      setError(cause?.message || 'Could not put those creatures on the map.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [enabled, monstersForRoom, sceneId, state.origin, state.placed, state.plan]);

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
    placeRoom,
  };
}
