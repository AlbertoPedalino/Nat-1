import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import {
  deleteInstanceFight,
  getInstanceFight,
  listInstanceFightRevisions,
  listInstanceFights,
  listInstanceFightsByIds,
  saveInstanceFight,
  subscribeInstanceFights,
} from '../../../shared/cloud/api/encounterFights.js';
import { coalesceReturns } from '../../../shared/cloud/sync/returnGate.js';
import { MAX_TARGETED_IDS } from '../../../shared/vtt/session/revisionDiff.js';
import { externalDelta } from './externalSync.js';
import { fightSignature, libraryCardUpdates, toFightEntry } from '../library/fightRecord.js';

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
// The same safety net as the battle map's: an event Realtime lost is found by
// the next check, which reads versions only and then just the fights that
// moved. Skipped while the tab is hidden; coming back checks at once.
export const FIGHT_RECONCILE_MS = 30_000;

export function useCloudFights({
  instanceId, fights, library, activeFightId, dispatch, isVitalsBusy,
}) {
  const isVitalsBusyRef = useRef(isVitalsBusy);
  isVitalsBusyRef.current = isVitalsBusy;
  const { cloudEnabled, status } = useAuth();
  const { notify } = useToast();
  const canSync = Boolean(cloudEnabled && status === 'authed' && instanceId);

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
  // The version (`updated_at`, ms) of each fight as last read or written here:
  // what the recovery poll compares with the database's.
  const versionsRef = useRef(new Map());
  // The newest vitals revision seen per fight. Realtime can deliver the row of
  // an earlier command after the answer to a later one; taking it put the old
  // hit points back on screen until the next echo put the new ones back.
  const vitalsSeenRef = useRef(new Map());
  const freshVitals = useCallback((entry) => {
    const revision = entry?.vitalsRevision;
    if (revision == null) return true;
    const key = String(entry.id);
    const seen = vitalsSeenRef.current.get(key);
    if (seen != null && revision < seen) return false;
    vitalsSeenRef.current.set(key, revision);
    return true;
  }, []);
  // Discovering a cloud row is not a local deletion intent. The reducer may
  // hide it in favour of the fight still running on this screen.
  const localIdsRef = useRef(new Set());
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
    versionsRef.current.clear();
    localIdsRef.current.clear();
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

  // Rows from the database into the reducer. A partial list is fine:
  // externalDelta only adds what is new or newer and never infers a delete.
  const absorbRows = useCallback((rows) => {
    for (const entry of rows) {
      settledRef.current.set(String(entry.id), fightSignature(entry));
      if (entry.savedAt) versionsRef.current.set(String(entry.id), entry.savedAt);
    }
    // The same merge the localStorage bridge uses, so a fight arriving from the
    // map is added and one the map has written to is refreshed — while the fight
    // on screen is left to the reducer that is running it.
    const held = heldRef.current;
    const library = held.library || [];
    const delta = externalDelta({ fightsData: { items: rows }, library: [] }, { ...held, library });
    // A fight is only reachable through the card of its encounter, and the
    // library is still a blob this device may never have been given. The card
    // rides along in the row for exactly this: without it the room would arrive
    // as a fight with nothing to open it from — and when the card is one this
    // device already has in an older version, the newer one replaces it.
    const cards = libraryCardUpdates(rows, library);
    if (delta.fights.length || cards.length) {
      dispatchRef.current({ type: 'absorbExternal', fights: delta.fights, library: cards });
    }
    // The fight on screen keeps its own turn and roster, but its enemies'
    // vitals are the row's: that is the one place they are written. While a
    // local vitals command is still in flight its own answer realigns instead.
    const activeKey = held.activeFightId == null ? null : String(held.activeFightId);
    const active = activeKey ? rows.find((entry) => String(entry.id) === activeKey) : null;
    if (active && !isVitalsBusyRef.current?.(active.id) && freshVitals(active)) {
      dispatchRef.current({ type: 'absorbFightVitals', fightId: active.id, fight: active.fight });
    }
  }, [freshVitals]);

  // What the database says is standing, against what this tab deleted. A
  // fight deleted here is not news from elsewhere: if its row is still there
  // the delete has not landed yet — or did not land at all — so it is asked
  // for again rather than being taken as a fight to restore. Returns the ids
  // that are fights to read.
  const settleStanding = useCallback((ids) => {
    const standing = new Set(ids.map(String));
    for (const key of [...removedRef.current.keys()]) {
      // Gone from the database is gone: the record agrees, so there is
      // nothing left to remember.
      if (!standing.has(key)) removedRef.current.delete(key);
      else askAgain(key);
    }
    // A fight gone from the database starts its counts again if made anew.
    for (const key of [...vitalsSeenRef.current.keys()]) {
      if (!standing.has(key)) vitalsSeenRef.current.delete(key);
    }
    for (const key of [...versionsRef.current.keys()]) {
      if (!standing.has(key)) versionsRef.current.delete(key);
    }
    return [...standing].filter((key) => !removedRef.current.has(key));
  }, [askAgain]);

  // The full read: the first load, and the fallback when there is nothing held
  // to compare with.
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
    const wanted = new Set(settleStanding(all.map((entry) => entry.id)));
    absorbRows(all.filter((entry) => wanted.has(String(entry.id))));
  }, [absorbRows, canSync, instanceId, settleStanding]);

  // The light recovery, as on the battle map: versions first, then only the
  // fights that are new or whose version moved. A quiet instance costs a few
  // bytes per fight instead of every fight's JSON again.
  const reconcile = useCallback(async () => {
    if (!canSync) return undefined;
    if (!loadedRef.current) return refresh();
    let revisions;
    try {
      revisions = await listInstanceFightRevisions(instanceId);
    } catch (_) {
      return undefined;
    }
    const wanted = new Set(settleStanding(revisions.map((revision) => revision.id)));
    // A fight this screen does not hold is read whatever its version: the
    // reducer may have set it aside (an older launch of the encounter on
    // screen) and must be offered it again, as the full read used to.
    const held = new Set((heldRef.current.fights || []).map((fight) => String(fight.id)));
    const changed = revisions
      .filter(({ id, updatedAt }) => wanted.has(id) && (!held.has(id) || versionsRef.current.get(id) !== updatedAt))
      .map(({ id }) => id);
    if (!changed.length) return undefined;
    let rows;
    try {
      rows = changed.length > MAX_TARGETED_IDS
        ? (await listInstanceFights(instanceId)).filter((entry) => changed.includes(String(entry.id)))
        : await listInstanceFightsByIds(instanceId, changed);
    } catch (_) {
      return undefined;
    }
    absorbRows(rows);
    return undefined;
  }, [absorbRows, canSync, instanceId, refresh, settleStanding]);

  // One realtime event. A complete INSERT/UPDATE row is applied as it came —
  // no re-read of every fight in the instance. A row Realtime had to trim
  // (it drops large columns past its size limit) is fetched alone. Everything
  // else is a recovery: a DELETE, deletes of ours still being verified, or an
  // event we cannot place (the full read only before the first load).
  const handleChange = useCallback((payload) => {
    if (!canSync) return undefined;
    const type = String(payload?.eventType || '').toUpperCase();
    const row = payload?.new;
    if (!loadedRef.current || removedRef.current.size || (type !== 'INSERT' && type !== 'UPDATE') || !row?.id) {
      return reconcile();
    }
    const complete = !payload.errors?.length && row.fight && typeof row.fight === 'object';
    if (complete) {
      const entry = toFightEntry(row);
      if (!entry) return reconcile();
      absorbRows([entry]);
      return undefined;
    }
    return getInstanceFight(row.id)
      .then((fresh) => {
        const entry = toFightEntry(fresh);
        if (entry) absorbRows([entry]);
        else return reconcile();
        return undefined;
      })
      // Offline: the next event, check or reconnect realigns.
      .catch(() => {});
  }, [absorbRows, canSync, reconcile]);

  verifyRef.current = reconcile;

  // A row this tab just received (an RPC answer or a recovery read). Settle it
  // first, so taking its vitals does not look like a local edit to save.
  const acceptRemoteFight = useCallback((row) => {
    const entry = toFightEntry(row);
    if (!entry) return;
    if (entry.savedAt) versionsRef.current.set(String(entry.id), entry.savedAt);
    if (!freshVitals(entry)) return;
    settledRef.current.set(String(entry.id), fightSignature(entry));
    dispatchRef.current({ type: 'absorbFightVitals', fightId: entry.id, fight: entry.fight });
  }, [freshVitals]);

  // Our own write is not a change to read back on the next check.
  const noteWritten = useCallback((row) => {
    const version = Date.parse(row?.updated_at);
    if (row?.id != null && version) versionsRef.current.set(String(row.id), version);
  }, []);

  // A local edit already sent through its own command: the full save has
  // nothing to add for it.
  const markSettled = useCallback((entry) => {
    if (entry?.id != null) settledRef.current.set(String(entry.id), fightSignature(entry));
  }, []);

  // The command could not be applied because the fight has no usable row yet:
  // store the fight the ordinary way, with what is on screen when it fires.
  const requestSave = useCallback((fightId) => {
    const key = String(fightId);
    const find = () => (heldRef.current.fights || []).find((fight) => String(fight.id) === key);
    if (!canSync || !find()) return;
    settledRef.current.set(key, fightSignature(find()));
    const running = timersRef.current.get(key);
    if (running) clearTimeout(running);
    timersRef.current.set(key, setTimeout(() => {
      timersRef.current.delete(key);
      const entry = find();
      if (entry) saveInstanceFight(instanceId, entry).then(noteWritten).catch(() => {});
    }, WRITE_DEBOUNCE_MS));
  }, [canSync, instanceId, noteWritten]);

  // First read, then every change to this instance's fights from anywhere.
  useEffect(() => {
    if (!canSync) return undefined;
    refresh();
    // SUBSCRIBED again after a reconnect: events missed while the socket was
    // down are not replayed, so read the list. The first one also covers the
    // gap between the read above and the subscription going live.
    return subscribeInstanceFights(instanceId, handleChange, {
      onStatus: (state) => { if (state === 'SUBSCRIBED') reconcile(); },
    });
  }, [canSync, handleChange, instanceId, reconcile, refresh]);

  // The safety net: every FIGHT_RECONCILE_MS while the tab is shown, and at
  // once when it is shown again or the network comes back.
  useEffect(() => {
    if (!canSync) return undefined;
    const check = () => { reconcile(); };
    const onReturn = coalesceReturns(check);
    const onVisible = () => { if (document.visibilityState === 'visible') onReturn(); };
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') check();
    }, FIGHT_RECONCILE_MS);
    window.addEventListener('focus', onReturn);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onReturn);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [canSync, reconcile]);

  // Local -> row. One write per fight that actually changed, so running a combat
  // does not rewrite the twenty rooms sitting beside it.
  useEffect(() => {
    if (!canSync) return;
    const seen = new Set();

    for (const entry of fights || []) {
      const key = String(entry.id);
      seen.add(key);
      localIdsRef.current.add(key);
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
        saveInstanceFight(instanceId, entry).then(noteWritten).catch(() => {
          // Best effort: the local copy still holds it, and the next change tries
          // again.
        });
      }, WRITE_DEBOUNCE_MS));
    }

    if (!loadedRef.current) return;
    for (const key of [...settledRef.current.keys()]) {
      if (seen.has(key)) continue;
      if (!localIdsRef.current.has(key)) continue;
      localIdsRef.current.delete(key);
      settledRef.current.delete(key);
      vitalsSeenRef.current.delete(key);
      // The pending write goes first. A fight saved half a second ago and
      // deleted now would otherwise have its own timer put the row back after
      // the delete had already run, and the encounter would be standing there
      // again — deleted, restored by us, and blamed on the database.
      const pending = timersRef.current.get(key);
      if (pending) clearTimeout(pending);
      timersRef.current.delete(key);
      askAgain(key);
    }
  }, [canSync, fights, instanceId, noteWritten]);

  return { canSync, acceptRemoteFight, markSettled, requestSave };
}
