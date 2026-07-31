// Shared confirm-before-discard helper. Wraps window.confirm (the
// established GM Board / project-wide confirmation convention) behind an
// injectable function so callers stay testable without a real window.
export function confirmDiscard(message, confirmFn = window.confirm) {
  return Boolean(confirmFn(message));
}
