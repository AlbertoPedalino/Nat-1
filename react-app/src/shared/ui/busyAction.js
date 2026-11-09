// A user action that waits on the cloud: `setBusy(true)` while `task` runs. A
// failure first runs `onError(cause)` (cleanup such as deleting an uploaded
// file; its own failure is ignored), then is reported — the cause's message,
// else `failure` — through `report(message)` (a panel's error line) or, by
// default, an error toast; it resolves to null. `success`, when given, is the
// toast for a task that finished (the app's rule: an action the user asked for
// says when it worked).
export async function runBusy({ setBusy, notify, report }, task, failure, { onError, success } = {}) {
  setBusy(true);
  try {
    const result = await task();
    if (success) notify?.('success', success);
    return result;
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
