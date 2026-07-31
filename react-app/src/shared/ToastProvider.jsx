import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AppToast from './AppToast.jsx';

// App-wide toast. One <AppToast> is mounted here (by ToastProvider) and every
// screen just calls notify() from useToast() — no per-screen Snackbar/state.
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  // { severity, msg, autoHideDuration? } | null
  const [toast, setToast] = useState(null);

  const notify = useCallback((severity, msg, options) => {
    setToast({ severity, msg, ...options });
  }, []);
  const clearToast = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ notify, clearToast }), [notify, clearToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AppToast toast={toast} onClose={clearToast} autoHideDuration={toast?.autoHideDuration} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>.');
  return ctx;
}
