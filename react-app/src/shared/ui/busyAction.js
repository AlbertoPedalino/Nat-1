// A user action that waits on the cloud: `setBusy(true)` while `task` runs. A
// failure first runs `onError(cause)` (cleanup such as deleting an uploaded
// file; its own failure is ignored), then is reported — the cause's message,
// else `failure` — through `report(message)` (a panel's error line) or, by
// default, an error toast; it resolves to null.
export async function runBusy({ setBusy, notify, report }, task, failure, { onError } = {}) {
  setBusy(true);
  try {
    return await task();
  } catch (cause) {
    if (onError) {
      try { await onError(cause); } catch { /* the report below matters more */ }
    }
    const message = cause?.message || failure;
    if (report) report(message);
    else notify('error', message);
    return null;
  } finally {
    setBusy(false);
  }
}
