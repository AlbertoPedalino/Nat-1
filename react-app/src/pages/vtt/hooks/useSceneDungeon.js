import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
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
//
// A map opened for the first time prepares itself: rolled, filled and fogged
// before the GM has looked at it. An empty dungeon is nobody's intention, and
// the panel is right there to roll it again if the first answer is not the one
// they wanted.

const EMPTY = Object.freeze({
  plan: null, key: null, placed: {}, origin: { col: 0, row: 0 },
});

// What a map fills itself with when nobody has said otherwise. Random rooms put
// something in some of them rather than in all; the tier is the mildest,
// because guessing a party's level from a scene is guessing.
const FIRST_ROLL = Object.freeze({ popMode: 'random', thr: 0, tier: 1 });

export function useSceneDungeon({
  scene, isGm, monsters, partySize, onPrepared,
}) {
  const sceneId = scene?.id || null;
  const campaignId = scene?.campaignId || null;
  const enabled = Boolean(isGm && sceneId);

  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  // Which scene has already had its first fill attempted, so a re-render cannot
  // start a second one and double every room.
  const preparedRef = useRef(null);

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
        setState(row ? {
          plan: row.plan, key: row.key, placed: row.placed, origin: row.origin,
        } : EMPTY);
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

  // What a room's encounter is worth, and what that buys.
  //
  // Seeded from the roll itself, so the answer is the same every time it is
  // asked. Drawn from Math.random it changed on every render — the panel showed
  // one set of creatures, the button placed another, and touching anything at
  // all shuffled both. The same key always buys the same monsters; rolling the
  // rooms again is what changes them.
  const chooseFor = useCallback((key, roomNumber) => {
    const keyRoom = key?.rooms?.[roomNumber - 1];
    if (!keyRoom) return null;
    const encounters = (keyRoom.slots || [])
      .map((slot) => slot.extra)
      .filter((extra) => extra?.kind === 'enc' && extra.data);
    if (!encounters.length) return null;
    const budget = encounters.reduce(
      (total, extra) => total + encounterBudget(extra.data, partySize),
      0,
    );
    return { budget, groups: fillBudget(priced, budget, seededRandom(`${key.id}:${roomNumber}`)) };
  }, [partySize, priced]);

  const monstersForRoom = useCallback(
    (roomNumber) => chooseFor(state.key, roomNumber),
    [chooseFor, state.key],
  );

  const markersForRoom = useCallback(
    (roomNumber) => roomMarkers(state.key?.rooms?.[roomNumber - 1]),
    [state.key],
  );

  // The tables belong to the board this campaign was linked to, exactly as the
  // hexcrawl's do: the dungeon a GM rolls on the map and the one they roll on
  // the board come off the same page.
  const rollKey = useCallback(async (config) => {
    const boardId = campaignId ? await readCampaignHexcrawlBoard(campaignId) : null;
    const board = boardId ? await readHexcrawlBoard(boardId) : null;
    if (!board?.tables) {
      throw new Error('This campaign has no hexcrawl board linked, and the tables come from it.');
    }
    // The engine numbers its rooms from one, in order, which is how the plan
    // numbers its own: room three of the key is room three of the map.
    return createDungeon({ roomCount: state.plan.rooms.length, ...config }, board.tables);
  }, [campaignId, state.plan]);

  // One room onto the board. Takes the key rather than reading it from state,
  // so filling twenty rooms in a row does not depend on twenty renders landing
  // in between.
  const putRoomOut = useCallback(async (key, roomNumber, origin) => {
    const room = state.plan?.rooms?.find((item) => item.number === roomNumber);
    const keyRoom = key?.rooms?.[roomNumber - 1];
    if (!room || !keyRoom) return [];
    const tokens = roomTokens({
      room,
      groups: chooseFor(key, roomNumber)?.groups || [],
      markers: roomMarkers(keyRoom),
      origin,
    });
    const created = [];
    for (const token of tokens) {
      created.push(await createToken(sceneId, token));
    }
    return created;
  }, [chooseFor, sceneId, state.plan]);

  const populate = useCallback(async (config = FIRST_ROLL) => {
    if (!enabled || !state.plan?.rooms?.length) return null;
    setBusy(true);
    try {
      const rolled = await rollKey(config);
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
  }, [enabled, rollKey, sceneId, state.plan]);

  const placeRoom = useCallback(async (roomNumber) => {
    if (!enabled || !state.key) return null;
    setBusy(true);
    try {
      const created = await putRoomOut(state.key, roomNumber, state.origin);
      if (!created.length) return null;
      const room = state.plan.rooms.find((item) => item.number === roomNumber);
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
  }, [enabled, putRoomOut, sceneId, state.key, state.origin, state.placed, state.plan]);

  // Opening an imported map for the first time: roll it, put every room out,
  // and let the scene cover itself in fog. The row is written once at the end
  // rather than room by room, so a fill cut short by a lost connection leaves a
  // map with no key — which is the state that tries again next time.
  useEffect(() => {
    if (!enabled || loading || preparing) return;
    if (!state.plan?.rooms?.length || state.key) return;
    // The bestiary decides what an encounter buys and loads on its own
    // schedule: filling before it arrives would put out empty rooms.
    if (!priced.length) return;
    if (preparedRef.current === sceneId) return;
    preparedRef.current = sceneId;

    let cancelled = false;
    (async () => {
      setPreparing(true);
      try {
        const key = await rollKey(FIRST_ROLL);
        const placed = {};
        for (const room of state.plan.rooms) {
          if (cancelled) return;
          const created = await putRoomOut(key, room.number, state.origin);
          if (created.length) placed[room.id] = created.map((token) => token.id);
        }
        if (cancelled) return;
        const saved = await updateSceneDungeon(sceneId, { key, placed });
        setState((current) => ({ ...current, key: saved.key, placed: saved.placed }));
        // A dungeon nobody has walked into yet is unexplored, so the map arrives
        // covered. The fog itself belongs to the scene, which owns it.
        onPrepared?.();
        setError('');
      } catch (cause) {
        if (!cancelled) setError(cause?.message || 'Could not prepare the dungeon.');
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [
    enabled, loading, onPrepared, preparing, priced.length, putRoomOut, rollKey,
    sceneId, state.key, state.origin, state.plan,
  ]);

  return {
    enabled: enabled && Boolean(state.plan),
    loading,
    busy: busy || preparing,
    preparing,
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
