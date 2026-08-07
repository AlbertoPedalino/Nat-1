import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import {
  deleteInstanceFight,
  listInstanceFights,
  saveInstanceFight,
  subscribeInstanceFights,
} from '../../../shared/cloud/encounterFights.js';
import { externalDelta } from '../logic/externalSync.js';
import { fightSignature, missingLibraryCards } from '../logic/fightRecord.js';

// The fights of this instance, with the database as the record.
//
// The party and the library are still a blob pushed on a timer, which suits
// what only this page edits. A fight is not that — the battle map writes one
// when a room is handed over, and reads it for every piece it drops — so it has
// a row of its own, and this is what keeps the two in step.
//
// Local storage keeps its copy: it is what a fight is run from with no account
// and no network, and it is still the fallback when either is missing. It is a
// fallback and never a second opinion — signed in, the row wins.
const WRITE_DEBOUNCE_MS = 500;

export function useCloudFights({
  instanceId, instanceSaved, fights, library, activeFightId, dispatch,
}) {
  const { cloudEnabled, status } = useAuth();
  const canSync = Boolean(cloudEnabled && status === 'authed' && instanceId && instanceSaved);

  const heldRef = useRef({ fights, library, activeFightId });
  heldRef.current = { fights, library, activeFightId };
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // What the database is known to hold, per fight: the last version we wrote or
  // were told about. A fight whose signature still matches has nothing to say.
  const settledRef = useRef(new Map());
  const timersRef = useRef(new Map());
  // Nothing is deleted from the cloud until its list has been read once, or a
  // page that opens before the first load would take an empty local list for
  // "the GM cleared everything".
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    settledRef.current.clear();
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, [instanceId]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const refresh = useCallback(async () => {
    if (!canSync) return;
    let rows;
    try {
      rows = await listInstanceFights(instanceId);
    } catch (_) {
      // Offline or refused: the local copy carries the session.
      return;
    }
    loadedRef.current = true;
    for (const entry of rows) settledRef.current.set(String(entry.id), fightSignature(entry));
    // The same merge the localStorage bridge uses, so a fight arriving from the
    // map is added and one the map has written to is refreshed — while the fight
    // on screen is left to the reducer that is running it.
    const held = heldRef.current;
    const library = held.library || [];
    const delta = externalDelta({ fightsData: { items: rows }, library: [] }, { ...held, library });
    // A fight is only reachable through the card of its encounter, and the
    // library is still a blob this device may never have been given. The card
    // rides along in the row for exactly this: without it the room would arrive
    // as a fight with nothing to open it from.
    const cards = missingLibraryCards(rows, library);
    if (delta.fights.length || cards.length) {
      dispatchRef.current({ type: 'absorbExternal', fights: delta.fights, library: cards });
    }
  }, [canSync, instanceId]);

  // First read, then every change to this instance's fights from anywhere.
  useEffect(() => {
    if (!canSync) return undefined;
    refresh();
    return subscribeInstanceFights(instanceId, refresh);
  }, [canSync, instanceId, refresh]);

  // Local -> row. One write per fight that actually changed, so running a combat
  // does not rewrite the twenty rooms sitting beside it.
  useEffect(() => {
    if (!canSync) return;
    const seen = new Set();

    for (const entry of fights || []) {
      const key = String(entry.id);
      seen.add(key);
      const signature = fightSignature(entry);
      if (settledRef.current.get(key) === signature) continue;
      settledRef.current.set(key, signature);

      const running = timersRef.current.get(key);
      if (running) clearTimeout(running);
      timersRef.current.set(key, setTimeout(() => {
        timersRef.current.delete(key);
        saveInstanceFight(instanceId, entry).catch(() => {
          // Best effort: the local copy still holds it, and the next change tries
          // again.
        });
      }, WRITE_DEBOUNCE_MS));
    }

    if (!loadedRef.current) return;
    for (const key of [...settledRef.current.keys()]) {
      if (seen.has(key)) continue;
      settledRef.current.delete(key);
      deleteInstanceFight(key).catch(() => {});
    }
  }, [canSync, fights, instanceId]);
}
