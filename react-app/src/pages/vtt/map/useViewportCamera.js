import {
  useCallback, useEffect, useLayoutEffect, useMemo, useState,
} from 'react';
import {
  DEFAULT_VIEW,
  cellSize,
  constrainCoverView,
  fillView,
  fitView,
  screenToWorld,
  worldToCell,
  zoomAt,
} from '../../../shared/vtt/map/geometry.js';
import { axialRound, isHexGrid, worldToAxial } from '../../../shared/vtt/map/hexGeometry.js';
import {
  cameraPoseToView, viewToCameraPose,
} from '../../../shared/vtt/session/cameraSync.js';
import { useEventListener } from '../../../shared/ui/useEventListener.js';

const WHEEL_STEP = 1.12;
// What sits on the map without being the map: tool panels, dialogs, popovers.
// The wheel, a pinch and the map's own menus leave these alone.
export const VIEWPORT_CONTROL_SELECTOR = '[data-viewport-control], .MuiModal-root, .MuiPopover-root, .MuiPopper-root';

// The camera over the board: pan and zoom, the viewport's measured size, the
// frame each new picture opens on, the wheel, following a presenter's camera,
// and the conversions from a pointer to board coordinates.
export function useViewportCamera({
  hostRef,
  grid,
  imageSize,
  imageUrl,
  backgroundOnly,
  cameraLocked,
  followView,
  onViewChange,
  viewCenterRef,
}) {
  const [view, setView] = useState(DEFAULT_VIEW);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const backgroundFrame = useMemo(() => (
    backgroundOnly && imageSize && viewportSize.width > 0 && viewportSize.height > 0
      ? {
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
      }
      : null
  ), [backgroundOnly, imageSize, viewportSize]);
  const backgroundCover = useMemo(
    () => (backgroundFrame ? fillView(backgroundFrame) : null),
    [backgroundFrame],
  );

  const constrainView = useCallback((next) => {
    if (!backgroundFrame) return next;
    return constrainCoverView(next, backgroundFrame);
  }, [backgroundFrame]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => {
      const box = host.getBoundingClientRect();
      setViewportSize((current) => (
        current.width === box.width && current.height === box.height
          ? current
          : { width: box.width, height: box.height }
      ));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [hostRef]);

  useEffect(() => {
    const pose = viewToCameraPose(view, viewportSize, { zoomBase: backgroundCover?.zoom });
    if (pose) onViewChange?.(pose);
  }, [backgroundCover, onViewChange, view, viewportSize]);

  // Projectors follow rather than jump. Each realtime target starts a short
  // interpolation from the frame already on screen; a newer target cancels it
  // and continues from that exact point, which stays smooth during a long pan.
  useEffect(() => {
    const converted = cameraPoseToView(followView, viewportSize, {
      zoomBase: backgroundCover?.zoom,
    });
    const target = converted ? constrainView(converted) : null;
    if (!target) return undefined;
    let frame = 0;
    let settled = false;
    const step = () => {
      setView((current) => {
        const next = constrainView({
          x: current.x + (target.x - current.x) * 0.34,
          y: current.y + (target.y - current.y) * 0.34,
          zoom: current.zoom + (target.zoom - current.zoom) * 0.34,
        });
        settled = Math.abs(next.x - target.x) < 0.15
          && Math.abs(next.y - target.y) < 0.15
          && Math.abs(next.zoom - target.zoom) < 0.001;
        return settled ? target : next;
      });
      if (!settled) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [backgroundCover, constrainView, followView, viewportSize]);

  // Reframe once per picture. A battlemap stays wholly visible with a little
  // breathing room; an establishing-shot background fills the screen and may
  // crop at the edges. Backgrounds also reframe when the viewport itself
  // changes shape (fullscreen and device rotation) so no letterboxing returns.
  const backgroundViewportWidth = backgroundOnly ? viewportSize.width : null;
  const backgroundViewportHeight = backgroundOnly ? viewportSize.height : null;
  useLayoutEffect(() => {
    if (!imageSize || !hostRef.current) return;
    const box = hostRef.current.getBoundingClientRect();
    const frameView = backgroundOnly ? fillView : fitView;
    setView(frameView({
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      viewportWidth: box.width,
      viewportHeight: box.height,
    }));
  }, [
    backgroundOnly,
    backgroundViewportHeight,
    backgroundViewportWidth,
    hostRef,
    imageSize,
    imageUrl,
  ]);

  const screenPoint = useCallback((event) => {
    const box = hostRef.current?.getBoundingClientRect();
    return { x: event.clientX - (box?.left || 0), y: event.clientY - (box?.top || 0) };
  }, [hostRef]);

  const handleWheel = useCallback((event) => {
    if (cameraLocked) return;
    // Fullscreen dialogs and the floating sheet live inside the fullscreen map
    // element (portals outside it are not painted by the browser). They are
    // still UI surfaces, not map canvas: let their own scroll container receive
    // the wheel instead of swallowing it here as map zoom.
    if (event.target.closest?.(VIEWPORT_CONTROL_SELECTOR)) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
    setView((current) => constrainView(zoomAt(current, factor, screenPoint(event))));
  }, [cameraLocked, constrainView, screenPoint]);

  // Wheel has to be a non-passive native listener: React's onWheel is passive,
  // and preventDefault there is ignored, so the page scrolls while zooming.
  useEventListener(hostRef, 'wheel', handleWheel, { passive: false });

  // Strokes are stored in cells, fractionally: recalibrating the grid must not
  // slide a drawing off the wall it was traced on.
  const cellPoint = useCallback((point) => {
    const world = screenToWorld(point, view);
    const size = cellSize(grid);
    return {
      x: (world.x - (grid.offsetX || 0)) / size,
      y: (world.y - (grid.offsetY || 0)) / size,
    };
  }, [grid, view]);

  // The cell under the middle of the view: col/row on squares, q/r on hexes.
  useEffect(() => {
    if (!viewCenterRef) return undefined;
    viewCenterRef.current = () => {
      if (!viewportSize.width || !viewportSize.height) return null;
      const world = screenToWorld({ x: viewportSize.width / 2, y: viewportSize.height / 2 }, view);
      if (isHexGrid(grid)) {
        const cell = axialRound(worldToAxial(world, grid));
        return { x: cell.q, y: cell.r };
      }
      const cell = worldToCell(world, grid);
      return { x: cell.col, y: cell.row };
    };
    return () => { viewCenterRef.current = null; };
  }, [grid, view, viewCenterRef, viewportSize]);

  return {
    view, setView, viewportSize, constrainView, screenPoint, cellPoint,
  };
}
