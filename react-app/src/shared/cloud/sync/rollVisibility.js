import { useCallback, useSyncExternalStore } from 'react';
import { getStorageItem, setStorageItem } from '../../storage/storage.js';
import { useEventListener } from '../../ui/useEventListener.js';

// Who sees a roll, decided in one place for every screen that rolls:
//
//   'player'  a player's roll (sheet, map)        — always the whole table;
//   'gm'      the GM's own roll (a creature, a custom roll from the builder
//             or the map)                          — the table only while the
//             GM has "show my rolls to players" on for that campaign;
//   'table'   a GM-side table roll (fumbles, the GM Board) — the GM only.
//
// The answer is the `visibility` the roll travels with: 'public' goes on the
// campaign's channel, 'gm' on the GM's private one (useRollChannel).
export function rollVisibility(kind, gmRollsShown) {
  if (kind === 'player') return 'public';
  if (kind === 'gm' && gmRollsShown) return 'public';
  return 'gm';
}

// "Show my rolls to players" for one campaign, on this device. Off until the
// GM turns it on. Kept in storage and read when a roll is made, so a roll uses
// the switch as it is now, set from any screen or tab.
const KEY_PREFIX = 'gb:gm-rolls-shown:';
const storageKey = (campaignId) => `${KEY_PREFIX}${campaignId}`;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readGmRollsShown(campaignId) {
  return Boolean(campaignId) && getStorageItem(storageKey(campaignId)) === '1';
}

// The switch's state for a switch to show: every one on the page redraws when
// any of them, or another tab, changes it.
export function useGmRollsShown(campaignId) {
  const shown = useSyncExternalStore(subscribe, () => readGmRollsShown(campaignId));
  useEventListener(window, 'storage', (event) => { if (event.key?.startsWith(KEY_PREFIX)) notify(); });
  const setShown = useCallback((next) => {
    if (!campaignId) return;
    setStorageItem(storageKey(campaignId), next ? '1' : '0');
    notify();
  }, [campaignId]);
  return [shown, setShown];
}
