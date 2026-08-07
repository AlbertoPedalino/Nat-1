import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { useToast } from '../../../shared/ToastProvider.jsx';
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
// Enough to ride out a blip, few enough that a row which will never go is said
// out loud rather than asked for until the tab is closed.
const DELETE_ATTEMPTS = 3;

export function useCloudFights({
  instanceId, instanceSaved, fights, library, activeFightId, dispatch,
}) {
  const { cloudEnabled, status } = useAuth();
  const { notify } = useToast();
  const canSync = Boolean(cloudEnabled && status === 'authed' && instanceId && instanceSaved);

  const heldRef = useRef({ fights, library, activeFightId });
  heldRef.current = { fights, library, activeFightId };
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  // `refresh` is what verifies a delete, and `askAgain` is called from inside
  // it: one of the two has to be reached through a ref or they would have to be
  // declared inside each other.
  const verifyRef = useRef(null);

  // What the database is known to hold, per fight: the last version we wrote or
  // were told about. A fight whose signature still matches has nothing to say.
  const settledRef = useRef(new Map());
  const timersRef = useRef(new Map());
  // Nothing is deleted from the cloud until its list has been read once, or a
  // page that opens before the first load would take an empty local list for
  // "the GM cleared everything".
  const loadedRef = useRef(false);
  // Fights deleted here, and how many times we have asked, until the database
  // agrees they are gone.
  //
  // Without this a delete undid itself. A read cannot tell "never seen" from
  // "just deleted", so any refresh landing while the row was still there put the
  // fight back — and with it the library card it carries, which is why the
  // encounter reappeared however many times it was removed.
  //
  // The count is what stops a row that refuses to go from being asked forever.
  // When the asking runs out the GM is told, because a delete that silently did
  // not happen is the worst of the three outcomes.
  const removedRef = useRef(new Map());

  useEffect(() => {
    loadedRef.current = false;
    settledRef.current.clear();
    removedRef.current.clear();
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, [instanceId]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  // Ask for a row to go, and check afterwards that it went. Realtime reports a
  // delete that worked, and reports nothing at all about one that failed — so
  // the only way to know is to look.
  const askAgain = useCallback((key) => {
    const attempts = (removedRef.current.get(key) || 0) + 1;
    removedRef.current.set(key, attempts);
    // Given up on, but not forgotten. The mark stays for the rest of the
    // session, or the row we failed to delete would be read back as a fight
    // from elsewhere and the encounter would reappear — the very thing the GM
    // was trying to be rid of. Said out loud once, because a delete that
    // silently did not happen is the worst of the three outcomes.
    if (attempts > DELETE_ATTEMPTS) {
      if (attempts === DELETE_ATTEMPTS + 1) {
        notifyRef.current('warning', 'That fight was removed here, but could not be deleted online. It may come back on another device.');
      }
      return;
    }
    deleteInstanceFight(key)
      .catch(() => {})
      // Whether it threw or not, the row is what decides. A delete that landed
      // clears the mark on the next read; one that did not comes back here.
      .then(() => { verifyRef.current?.(); });
  }, []);

  const refresh = useCallback(async () => {
    if (!canSync) return;
    let all;
    try {
      all = await listInstanceFights(instanceId);
    } catch (_) {
      // Offline or refused: the local copy carries the session.
      return;
    }
    loadedRef.current = true;

    // A fight deleted here is not news from elsewhere. If its row is still
    // standing the delete has not landed yet — or did not land at all — so it is
    // asked for again rather than being taken as a fight to restore.
    const rows = [];
    const stillThere = new Set();
    for (const entry of all) {
      const key = String(entry.id);
      if (!removedRef.current.has(key)) {
        rows.push(entry);
        continue;
      }
      stillThere.add(key);
      askAgain(key);
    }
    // Gone from the database is gone: the record agrees, so there is nothing
    // left to remember.
    for (const key of [...removedRef.current.keys()]) {
      if (!stillThere.has(key)) removedRef.current.delete(key);
    }

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

  verifyRef.current = refresh;

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
      // Back from the dead, on purpose: a fight the GM removed and then created
      // again is a fight to write, not one to keep deleting.
      removedRef.current.delete(key);
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
      // The pending write goes first. A fight saved half a second ago and
      // deleted now would otherwise have its own timer put the row back after
      // the delete had already run, and the encounter would be standing there
      // again — deleted, restored by us, and blamed on the database.
      const pending = timersRef.current.get(key);
      if (pending) clearTimeout(pending);
      timersRef.current.delete(key);
      askAgain(key);
    }
  }, [canSync, fights, instanceId]);
}
