import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { readSceneDungeon, saveSceneDungeon } from '../../../shared/cloud/api/dungeon.js';
import { listInstanceFights, saveInstanceFight } from '../../../shared/cloud/api/encounterFights.js';
import {
  readHexcrawlBoard,
} from '../../../shared/cloud/api/hexcrawl.js';
import { createDungeon } from '../../gmboard/dungeon/dungeon.js';
import { encounterBudget, fillBudget } from '../../../shared/dungeon/roomBudget.js';
import { crXP, getCR } from '../../encounterbuilder/bestiary/monsterUtils.js';
import { roomMarkers } from '../../../shared/dungeon/roomMarkers.js';
import { seededRandom } from '../../../shared/dungeon/seededRandom.js';
import {
  pickEncounterInstanceInGroup,
} from '../../../shared/dungeon/linkedEncounters.js';
import { readCampaignToolLinks } from '../../../shared/cloud/api/campaignTools.js';
import { readLocalToolInstances, mergeLinkedInstanceRows } from '../../../shared/instances/instanceLinks.js';
import { getCloudSection } from '../../../shared/cloud/sections/cloudSections.js';
import { localFightPresence, sendEncounterToBuilder } from '../../encounterbuilder/sync/handoff.js';
import { readPersistedInstance } from '../../encounterbuilder/state/storage.js';
import { restoreFight } from '../../encounterbuilder/combat/combat.js';
import { importableCombatants } from '../../../shared/vtt/tokens/encounterImport.js';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';

// The dungeon a map is being played as: how many rooms, what is in them, and
// what their fights are worth.
//
// No floor plan is read. That was tried and it worked for exactly one export of
// one generator: caves have no data at all, dwellings a different shape, and a
// map drawn by hand none. The room count is a number the GM knows by looking at
// the picture, and typing it takes less time than a file ever did — so this is
// the same panel whether the map came from a generator or a scanner.
//
// The rolling itself is not reimplemented: `createDungeon` is the GM Board's own
// engine, so the dungeon rolled on the map and the one rolled on the board come
// off the same page.

const EMPTY = Object.freeze({ key: null, fights: {} });

function roomLinkWithFight(link, entry, monsters) {
  if (!entry) return link;
  return { ...link, combatants: importableCombatants(restoreFight(entry, monsters)) };
}

export function useSceneDungeon({ scene, isGm, monsters, partySize, roster }) {
  const { cloudEnabled, status } = useAuth();
  const sceneId = scene?.id || null;
  const campaignId = scene?.campaignId || null;
  const enabled = Boolean(isGm && sceneId);

  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [boardId, setBoardId] = useState(null);
  const [encounterInstance, setEncounterInstance] = useState(null);
  const [resolvingLink, setResolvingLink] = useState(false);
  const [linkHint, setLinkHint] = useState('');

  useEffect(() => {
    let cancelled = false;
    let request = 0;
    setBoardId(null);
    setEncounterInstance(null);
    setLinkHint('');
    if (!enabled || !campaignId) return () => { cancelled = true; };
    setResolvingLink(true);
    const refresh = async () => {
      const ticket = ++request;
      try {
        const campaign = await readCampaignToolLinks(campaignId);
        if (cancelled || ticket !== request) return;
        setBoardId(campaign?.hexcrawl_board_id || null);
        const local = readLocalToolInstances().filter((row) => row.sectionKey === 'encounters');
        const cloud = cloudEnabled && status === 'authed'
          ? await getCloudSection('encounters').listInstances() : [];
        if (cancelled || ticket !== request) return;
        const encounters = mergeLinkedInstanceRows('encounters', cloud, local);
        const instance = pickEncounterInstanceInGroup(encounters, campaign?.link_group_id);
        setEncounterInstance(instance);
        setLinkHint(instance ? '' : 'Link exactly one Encounter Builder from this map?s Linked tools menu to send fights.');
      } catch (cause) {
        if (!cancelled && ticket === request) {
          setEncounterInstance(null);
          setLinkHint(cause?.message || 'Could not load campaign links.');
        }
      } finally {
        if (!cancelled && ticket === request) setResolvingLink(false);
      }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    window.addEventListener('gb:campaign-board-link-changed', refresh);
    window.addEventListener('gb:instance-links-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('gb:campaign-board-link-changed', refresh);
      window.removeEventListener('gb:instance-links-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [campaignId, enabled, cloudEnabled, status]);

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
        setState(row ? { key: row.key, fights: row.fights } : EMPTY);
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
  // one set of creatures and the button placed another. The same key always
  // buys the same monsters; rolling again is what changes them.
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
  // hexcrawl's do.
  const roll = useCallback(async ({
    roomCount, popMode = 'random', thr = 0, tier = 1,
  }) => {
    if (!enabled) return null;
    setBusy(true);
    try {
      const board = boardId ? await readHexcrawlBoard(boardId) : null;
      if (!board?.tables) {
        throw new Error('This campaign has no GM Board linked, and the tables come from it.');
      }
      const rolled = createDungeon({ roomCount, popMode, thr, tier }, board.tables);
      // A fresh roll is a different dungeon: the fights sent from the old one
      // belong to rooms that no longer exist.
      const saved = await saveSceneDungeon(sceneId, { key: rolled, fights: {} });
      setState({ key: saved.key, fights: saved.fights });
      setError('');
      return saved.key;
    } catch (cause) {
      setError(cause?.message || 'Could not roll the dungeon.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [boardId, enabled, sceneId]);

  const clear = useCallback(async () => {
    if (!enabled) return;
    setBusy(true);
    try {
      const saved = await saveSceneDungeon(sceneId, { key: null, fights: {} });
      setState({ key: saved.key, fights: saved.fights });
      setError('');
    } catch (cause) {
      setError(cause?.message || 'Could not clear the dungeon.');
    } finally {
      setBusy(false);
    }
  }, [enabled, sceneId]);

  // A room's creatures, written into the linked Encounter Builder as a saved
  // encounter and a fight. What comes back is what the map drops pieces with, so
  // the creatures on the board and the ones being tracked are the same ones from
  // the first round.
  const sendRoomToBuilder = useCallback(async (roomNumber, { title } = {}) => {
    if (!enabled) return null;
    if (!encounterInstance) {
      setError(linkHint);
      return null;
    }
    const chosen = chooseFor(state.key, roomNumber);
    if (!chosen?.groups?.length) return null;
    const roomId = state.key.rooms[roomNumber - 1]?.id || `room_${roomNumber}`;

    // Sent once is sent — unless the encounter has been deleted in the builder
    // since. The room's record lives in the scene and knows nothing about that,
    // which is how deleting an imported room and importing it again gave the GM
    // nothing at all: the room still claimed a fight that was gone.
    const existing = state.fights?.[roomId];
    if (existing?.fightId) {
      const presence = localFightPresence(existing.instanceId, existing.fightId);
      // The room link contains the creatures as first sent. Reimport from the
      // saved fight so later conditions, damage and deaths survive token removal.
      if (presence === 'present') {
        const persisted = readPersistedInstance(existing.instanceId, priced);
        const entry = (persisted?.fightsData?.items || [])
          .find((fight) => String(fight.id) === String(existing.fightId));
        return roomLinkWithFight(existing, entry, priced);
      }
      if (cloudEnabled && status === 'authed') {
        try {
          const rows = await listInstanceFights(existing.instanceId);
          const entry = rows.find((row) => String(row.id) === String(existing.fightId));
          if (entry) return roomLinkWithFight(existing, entry, priced);
        } catch (_) {
          // Offline or refused: the database has not said the fight is gone, so
          // it is left standing rather than duplicated on a network blip.
          return existing;
        }
      } else if (presence === 'unknown') {
        // Without a local copy or a cloud answer there is no evidence of deletion.
        return existing;
      }
    }

    setBusy(true);
    try {
      const link = sendEncounterToBuilder(encounterInstance.id, {
        name: `${title || 'Dungeon'} — room ${roomNumber}`,
        groups: chosen.groups,
        monsters: priced,
        // The party's own colours and faces. The builder keeps a copy of them
        // from the day each character was imported, and the sheet is where they
        // are actually edited — the map is holding the current answer, so it
        // hands it over rather than letting the fight be built from a stale one.
        roster,
      });
      // The fight itself goes to its own row, which is what makes it a fight and
      // not a note in this browser: the builder reads it from there, on this
      // screen or on another. The snapshot is deliberately kept out of what the
      // dungeon stores — that record only needs to say which fight a room is.
      const { entry, ...roomLink } = link;
      // Its own attempt, and not a fatal one: the fight is already written in
      // this browser and the room can be run from here whatever the database
      // says. What fails is only the part that would let another screen see it,
      // and that is worth a sentence rather than losing the send.
      let reach = '';
      try {
        await saveInstanceFight(encounterInstance.id, entry);
      } catch (cause) {
        reach = `The room was sent, but only to this browser: ${cause?.message || 'the fight could not be saved online.'}`;
      }
      const fights = { ...state.fights, [roomId]: roomLink };
      setState((current) => ({ ...current, fights }));
      await saveSceneDungeon(sceneId, { fights });
      setError(reach);
      return roomLink;
    } catch (cause) {
      setError(cause?.message || 'Could not send that room to the Encounter Builder.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [
    linkHint, chooseFor, cloudEnabled, enabled, encounterInstance, priced, roster, sceneId, status,
    state.fights, state.key,
  ]);

  return {
    enabled,
    loading,
    busy,
    error,
    key: state.key,
    fights: state.fights,
    roll,
    clear,
    monstersForRoom,
    markersForRoom,
    sendRoomToBuilder,
    encounterInstance,
    linkHint: encounterInstance || resolvingLink ? '' : linkHint,
  };
}
