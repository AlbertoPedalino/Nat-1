import { useEffect, useState } from 'react';
import { useEventListener } from '../../../shared/ui/useEventListener.js';

// Keep artwork failure separate from the colour fallback so an unavailable
// portrait still leaves a usable piece on the board. A failed image is tried
// again after a while, and whenever the device comes back online or to the
// foreground.
export function useArtworkRetry(imageUrl) {
  const [artworkFailed, setArtworkFailed] = useState(false);
  useEffect(() => { setArtworkFailed(false); }, [imageUrl]);
  // Remount the failed image even when signing returns the same cached URL.
  const retryArtwork = () => setArtworkFailed(false);
  const retriesArtwork = artworkFailed && Boolean(imageUrl);
  useEffect(() => {
    if (!retriesArtwork) return undefined;
    const timer = window.setTimeout(() => setArtworkFailed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [retriesArtwork, imageUrl]);
  useEventListener(window, 'online', retryArtwork, { enabled: retriesArtwork });
  useEventListener(window, 'focus', retryArtwork, { enabled: retriesArtwork });
  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') retryArtwork();
  }, { enabled: retriesArtwork });

  return {
    showArtwork: Boolean(imageUrl) && !artworkFailed,
    markArtworkFailed: () => setArtworkFailed(true),
  };
}
