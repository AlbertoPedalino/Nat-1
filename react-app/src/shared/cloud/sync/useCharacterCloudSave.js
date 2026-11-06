import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SHEET_CONFLICT } from '../api/cloudCharacters.js';
import { createCloudSaveQueue } from './cloudSaveQueue.js';
import { listenForRecovery } from './recoveryTriggers.js';

// The one way a character editor (the builder, a cloud sheet) writes its
// character to the cloud.
//
//   - `request()` runs `save()` through one queue: never two at once, and a
//     request made while one runs is the next save, which reads the latest
//     state when it starts. `save()` returns the result, or null when there is
//     nothing to write (or a conflict is waiting).
//   - A save refused because the cloud moved on (SHEET_CONFLICT) goes to
//     `onConflict` and is not retried: the user decides.
//   - Any other failure goes to `onError` once until a save succeeds (or
//     `resetErrorNotice()`), and is retried on the shared recovery triggers
//     (online, focus, visibility, every 30 s), as is anything `hasPending()`
//     reports still unsaved.
//
// Resolves `request()` with the save's result, or null when it failed.
export function useCharacterCloudSave({
  save, onConflict, onError, hasPending = null, enabled = true, whenHidden = false,
}) {
  const callbacks = useRef({});
  callbacks.current = { save, onConflict, onError, hasPending };
  const failedRef = useRef(false);
  const errorShownRef = useRef(false);
  const queueRef = useRef(null);
  if (!queueRef.current) queueRef.current = createCloudSaveQueue(() => callbacks.current.save());

  const request = useCallback(async () => {
    try {
      const result = await queueRef.current();
      failedRef.current = false;
      errorShownRef.current = false;
      return result;
    } catch (error) {
      if (error?.code === SHEET_CONFLICT) {
        failedRef.current = false;
        callbacks.current.onConflict?.(error);
        return null;
      }
      failedRef.current = true;
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        callbacks.current.onError?.(error);
      }
      return null;
    }
  }, []);

  const resetErrorNotice = useCallback(() => { errorShownRef.current = false; }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    return listenForRecovery(() => {
      if (failedRef.current || callbacks.current.hasPending?.()) request();
    }, { periodic: true, whenHidden });
  }, [enabled, request, whenHidden]);

  return useMemo(() => ({ request, resetErrorNotice }), [request, resetErrorNotice]);
}
