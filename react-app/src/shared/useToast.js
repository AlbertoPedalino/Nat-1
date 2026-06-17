import { useState, useCallback } from 'react';

// Shared toast state for screens that show app notifications via <AppToast>.
// `notify(severity, msg)` opens one; `clearToast()` dismisses it.
export function useToast() {
  const [toast, setToast] = useState(null); // { severity, msg } | null
  const notify = useCallback((severity, msg) => setToast({ severity, msg }), []);
  const clearToast = useCallback(() => setToast(null), []);
  return { toast, notify, clearToast };
}
