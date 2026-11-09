// The app's failure line: what the user tried and, when known, why it did not
// work — "Could not delete the save: permission denied." `failure` is the
// action ("Could not delete the save."); `cause` an Error, a message or
// nothing. A failure of several sentences takes the reason after its first.
export function failureMessage(failure, cause) {
  const reason = String(typeof cause === 'string' ? cause : cause?.message || '').trim().replace(/[.!]+$/, '');
  if (!reason) return failure;
  const text = String(failure).trim();
  const end = text.search(/\.(\s|$)/);
  const first = end === -1 ? text : text.slice(0, end);
  const rest = end === -1 ? '' : text.slice(end + 1).trim();
  return `${first}: ${reason}.${rest ? ` ${rest}` : ''}`;
}

// A user action that waits on the cloud: `setBusy(true)` while `task` runs. A
// failure first runs `onError(cause)` (cleanup such as deleting an uploaded
// file; its own failure is ignored), then is reported — failureMessage(failure,
// cause) — through `report(message)` (a panel's error line) or, by default, an
// error toast; it resolves to null. `success`, when given, is the
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
    const message = failureMessage(failure, cause);
    if (report) report(message);
    else notify('error', message);
    return null;
  } finally {
    setBusy(false);
  }
}
