import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { patchCharacterData } from '../../../shared/cloud/cloudCharacters.js';
import { combatantToSheetPatch, sheetPatchKey } from '../logic/sheetSync.js';

const SYNC_DEBOUNCE_MS = 650;

export function useFightSheetSync(combat) {
  const { cloudEnabled, status, user } = useAuth();
  const { notify } = useToast();
  const canSync = Boolean(cloudEnabled && status === 'authed' && user?.id);
  const notifyRef = useRef(notify);
  const canSyncRef = useRef(canSync);
  const mountedRef = useRef(false);
  const lastSyncedRef = useRef(new Map());
  const lastWrittenRef = useRef(new Map());
  const syncVersionRef = useRef(new Map());
  const timersRef = useRef(new Map());
  const pendingRef = useRef(new Map());
  const inFlightRef = useRef(new Set());

  notifyRef.current = notify;
  canSyncRef.current = canSync;

  function getVersion(charId) {
    return syncVersionRef.current.get(charId) || 0;
  }

  function bumpVersion(charId) {
    const next = getVersion(charId) + 1;
    syncVersionRef.current.set(charId, next);
    return next;
  }

  const clearTimer = useCallback((charId) => {
    const key = String(charId);
    const timer = timersRef.current.get(key);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(key);
  }, []);

  function clearPendingTimers() {
    pendingRef.current.clear();
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }

  function scheduleFlush(charId, delay = SYNC_DEBOUNCE_MS) {
    clearTimer(charId);
    timersRef.current.set(charId, setTimeout(() => {
      timersRef.current.delete(charId);
      flushPending(charId);
    }, delay));
  }

  async function flushPending(charId) {
    const key = String(charId);
    if (!canSyncRef.current) {
      pendingRef.current.delete(key);
      return;
    }
    if (inFlightRef.current.has(key)) return;
    const pending = pendingRef.current.get(key);
    if (!pending) return;
    pendingRef.current.delete(key);
    inFlightRef.current.add(key);
    // Realtime sends our own RPC write back to us; keep the written value so
    // the websocket handler can ignore that echo without suppressing max HP.
    lastWrittenRef.current.set(key, pending.key);
    try {
      await patchCharacterData(key, pending.patch);
      if (getVersion(key) === pending.version) {
        lastSyncedRef.current.set(key, pending.key);
      }
    } catch (error) {
      if (mountedRef.current) {
        notifyRef.current('error', `Combat sheet sync failed for ${pending.name}: ${error?.message || error}`);
      }
    } finally {
      inFlightRef.current.delete(key);
      if (pendingRef.current.has(key)) scheduleFlush(key, 0);
    }
  }

  const markCharacterSynced = useCallback((charId, patch) => {
    if (!charId || !patch) return;
    const key = String(charId);
    lastSyncedRef.current.set(key, sheetPatchKey(patch));
    lastWrittenRef.current.delete(key);
    pendingRef.current.delete(key);
    clearTimer(key);
    bumpVersion(key);
  }, [clearTimer]);

  const isOutboundEcho = useCallback((charId, patch) => {
    if (!charId || !patch) return false;
    return lastWrittenRef.current.get(String(charId)) === sheetPatchKey(patch);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
      pendingRef.current.clear();
      inFlightRef.current.clear();
      lastWrittenRef.current.clear();
      syncVersionRef.current.clear();
    };
  }, []);

  useEffect(() => {
    lastSyncedRef.current.clear();
    lastWrittenRef.current.clear();
    syncVersionRef.current.clear();
    clearPendingTimers();
  }, [user?.id]);

  useEffect(() => {
    if (canSync) return;
    clearPendingTimers();
  }, [canSync]);

  useEffect(() => {
    lastSyncedRef.current.clear();
    lastWrittenRef.current.clear();
    syncVersionRef.current.clear();
    clearPendingTimers();
  }, [combat?.fightId]);

  useEffect(() => {
    if (!canSync) return;
    const linkedPlayers = new Map();
    (combat?.combatants || []).forEach((combatant) => {
      if (combatant?.type === 'player' && combatant.sourceId) {
        linkedPlayers.set(String(combatant.sourceId), combatant);
      }
    });

    linkedPlayers.forEach((combatant, charId) => {
      const patch = combatantToSheetPatch(combatant);
      const key = sheetPatchKey(patch);
      const lastKey = lastSyncedRef.current.get(charId);
      if (!lastKey) {
        lastSyncedRef.current.set(charId, key);
        return;
      }
      if (lastKey === key) return;
      const pending = pendingRef.current.get(charId);
      if (pending?.key === key) return;
      pendingRef.current.set(charId, {
        key,
        patch,
        name: combatant.name || 'character',
        version: getVersion(charId),
      });
      scheduleFlush(charId);
    });
  }, [canSync, combat?.combatants]);

  return useMemo(() => ({
    isOutboundEcho,
    markCharacterSynced,
  }), [isOutboundEcho, markCharacterSynced]);
}
