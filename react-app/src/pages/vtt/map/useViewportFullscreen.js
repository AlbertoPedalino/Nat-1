import { useCallback, useEffect, useState } from 'react';
import { useEventListener } from '../../../shared/ui/useEventListener.js';

// Fullscreen for the map — the browser's own, or a window-covering stand-in
// where the browser will not give us the real thing — and the floating
// character sheet that only exists while the map is fullscreen.
export function useViewportFullscreen({ hostRef, fullscreenSheet, onFullscreenChange }) {
  const [fullscreen, setFullscreen] = useState(false);
  // The stand-in for fullscreen where the browser will not give us the real
  // thing.
  const [covering, setCovering] = useState(false);
  // The floating sheet is the page's to open as well when it passes `open`:
  // a creature clicked on a fullscreen board shows its stat block in it.
  const [localSheetOpen, setLocalSheetOpen] = useState(false);
  const floatingSheetOpen = fullscreenSheet?.open ?? localSheetOpen;
  const onSheetOpenChange = fullscreenSheet?.onOpenChange;
  const setFloatingSheetOpen = useCallback((next) => {
    setLocalSheetOpen(next);
    onSheetOpenChange?.(next);
  }, [onSheetOpenChange]);

  // iPad's native fullscreen can dismiss itself during map pan/pinch gestures.
  // Use the window-covering mode on iOS, including iPads identifying as Macs.
  const toggleFullscreen = useCallback(async () => {
    const host = hostRef.current;
    if (!host) return;
    const request = host.requestFullscreen || host.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (covering) {
      setCovering(false);
      return;
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (/Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1);
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) await exit?.call(document);
      else if (ios || !request) setCovering(true);
      else await request.call(host);
    } catch (_) {
      setCovering(true);
    }
  }, [covering, hostRef]);

  const fullscreenActive = fullscreen || covering;

  useEventListener(document, 'keydown', (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) setCovering(false);
  }, { enabled: covering });

  useEffect(() => {
    onFullscreenChange?.(fullscreenActive);
    if (!fullscreenActive) setFloatingSheetOpen(false);
  }, [fullscreenActive, onFullscreenChange, setFloatingSheetOpen]);

  // Escape and the browser's own control leave fullscreen without telling us,
  // so the icon follows the document rather than our last click.
  const syncFullscreen = () => setFullscreen(
    document.fullscreenElement === hostRef.current
    || document.webkitFullscreenElement === hostRef.current,
  );
  useEventListener(document, 'fullscreenchange', syncFullscreen);
  useEventListener(document, 'webkitfullscreenchange', syncFullscreen);

  return {
    covering, fullscreenActive, toggleFullscreen, floatingSheetOpen, setFloatingSheetOpen,
  };
}
