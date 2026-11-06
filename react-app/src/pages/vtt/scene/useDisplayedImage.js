import { useCallback, useEffect, useRef, useState } from 'react';
import { signMapImage } from '../../../shared/cloud/api/vttMapImages.js';
import { sceneView, viewImagePath } from '../../../shared/vtt/scene/scene.js';

function waitForImage(image) {
  if (typeof image.decode === 'function') return image.decode();
  return new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Image failed to load.'));
    if (image.complete) {
      if (image.naturalWidth > 0) resolve();
      else reject(new Error('Image failed to load.'));
    }
  });
}

function naturalImageSize(image) {
  const width = Number(image.naturalWidth);
  const height = Number(image.naturalHeight);
  return width > 0 && height > 0 ? { width, height } : null;
}

// The picture on screen for the view this client is looking at: signed and
// decoded before it replaces the previous frame. `repairImage` is the
// reconciliation's way to retry a load that failed.
export function useDisplayedImage({ scene, view, notify }) {
  // What is actually on screen: the URL and the mode it belongs to, updated
  // together once the picture has loaded.
  const [displayed, setDisplayed] = useState(() => ({
    sceneId: scene.id,
    url: null,
    imageSize: null,
    path: viewImagePath(scene, sceneView(scene)),
    shownImage: scene.shownImage,
  }));
  // A picture that failed to sign or decode leaves this client on the previous
  // frame, and the scene row it would re-read is already correct — so nothing
  // reruns the load on its own. The reconciliation that already repairs the
  // rest of the scene bumps this instead, which is the one dependency the
  // loader needs to try again.
  const [imageAttempt, setImageAttempt] = useState(0);
  const imageOnScreenRef = useRef(false);
  const imageLoadingRef = useRef(false);

  const shownImageForViewport = view.shownImage;
  const shownPath = viewImagePath(scene, view);
  const shownPathOrNull = shownPath || null;
  const displayIsTarget = displayed.sceneId === scene.id
    && displayed.shownImage === shownImageForViewport
    && displayed.path === shownPathOrNull;
  // Keep the complete previous composition on screen while the next image is
  // signed and decoded. Switching the mode immediately used to paint a blank
  // frame between Battlemap and Background, which was the visible flicker. A
  // different scene is never retained: that could expose the previous table's
  // image while navigation is already showing the new scene.
  const canHoldCurrentFrame = displayed.sceneId === scene.id
    && Boolean(displayed.url)
    && Boolean(shownPath);
  const viewportDisplay = displayIsTarget || canHoldCurrentFrame
    ? displayed
    : {
      sceneId: scene.id,
      url: null,
      imageSize: null,
      path: shownPathOrNull,
      shownImage: shownImageForViewport,
    };
  // Read by the reconciliation, which runs outside rendering. Matching path
  // and mode is not enough: the initial state already carries those with no
  // URL behind them, which is exactly the empty frame to repair.
  imageOnScreenRef.current = displayIsTarget && (!shownPathOrNull || Boolean(displayed.url));

  // The picture and everything that belongs to it change together. Flipping the
  // mode as soon as the row changed showed the switch in three steps: fog off,
  // bare map for a beat, then the background — and the reverse on the way back,
  // which briefly showed an uncovered battlemap to the whole table.
  useEffect(() => {
    let cancelled = false;
    if (!shownPath) {
      setDisplayed({
        sceneId: scene.id,
        url: null,
        imageSize: null,
        path: null,
        shownImage: shownImageForViewport,
      });
      return () => { cancelled = true; };
    }

    imageLoadingRef.current = true;
    signMapImage(shownPath)
      .then((url) => {
        if (cancelled || !url) return null;
        // Decoded before it is shown, so the swap is one frame with the new
        // picture already in memory rather than a gap while it downloads.
        const image = new Image();
        image.src = url;
        return waitForImage(image)
          .then(() => {
            if (!cancelled) {
              setDisplayed({
                sceneId: scene.id,
                url,
                imageSize: naturalImageSize(image),
                path: shownPath,
                shownImage: shownImageForViewport,
              });
            }
          });
      })
      .catch(() => {
        if (!cancelled) {
          // Do not replace a valid composition with a broken image. Keeping the
          // previous frame also avoids bringing the transition flicker back.
          notify('error', 'Could not load the scene image.');
        }
      })
      .finally(() => { if (!cancelled) imageLoadingRef.current = false; });
    return () => {
      cancelled = true;
      imageLoadingRef.current = false;
    };
  }, [scene.id, shownImageForViewport, shownPath, imageAttempt]);

  // The picture is part of the scene as much as the row is. A load that
  // failed earlier is not visible in the data, so the reconciliation repairs
  // it too — unless one is still running, whose download this would only
  // restart.
  const repairImage = useCallback(() => {
    if (!imageOnScreenRef.current && !imageLoadingRef.current) {
      setImageAttempt((attempt) => attempt + 1);
    }
  }, []);

  return { viewportDisplay, repairImage };
}
