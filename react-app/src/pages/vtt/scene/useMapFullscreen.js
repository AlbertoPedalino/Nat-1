import { useCallback, useEffect, useRef, useState } from 'react';

// Whether the board is fullscreen, mirrored to the page, and the floating sheet
// such a board carries.
export function useMapFullscreen(onMapFullscreenChange) {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  // The floating sheet of a fullscreen board, held here so a creature clicked
  // on that board can open its stat block in it.
  const [floatingSheetOpen, setFloatingSheetOpen] = useState(false);

  // The page is told as well, because its own top bar is fixed and painted above
  // the map. Where the browser has no Fullscreen API — a phone — "fullscreen" is
  // the map covering the window, and the bar stayed on top of it, over exactly
  // the corner controls that live at the top of the board.
  const handleMapFullscreenChange = useCallback((active) => {
    setMapFullscreen(active);
    onMapFullscreenChange?.(active);
  }, [onMapFullscreenChange]);

  // Leaving the scene while covering the window must give the bar back, or the
  // page returns to a list with no way out of it. Through a ref, so a caller
  // passing a fresh function every render does not have the cleanup run — and
  // the bar come back mid-fullscreen — on every one of them.
  const mapFullscreenNoticeRef = useRef(onMapFullscreenChange);
  mapFullscreenNoticeRef.current = onMapFullscreenChange;
  useEffect(() => () => mapFullscreenNoticeRef.current?.(false), []);

  return {
    mapFullscreen,
    handleMapFullscreenChange,
    floatingSheetOpen,
    setFloatingSheetOpen,
  };
}
