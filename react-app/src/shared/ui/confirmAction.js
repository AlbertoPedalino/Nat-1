// The app's one way to ask "are you sure?": the browser's confirm, behind an
// injectable function so callers stay testable without a real window.
export function confirmAction(message, confirmFn = window.confirm) {
  return Boolean(confirmFn(message));
}
