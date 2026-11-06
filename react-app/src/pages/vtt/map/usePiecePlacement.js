import { useCallback, useEffect, useState } from 'react';
import { screenToWorld, worldToCell } from '../../../shared/vtt/map/geometry.js';
import { axialRound, isHexGrid, worldToAxial } from '../../../shared/vtt/map/hexGeometry.js';
import { PIECE_POINTER_DRAG_EVENT } from '../tokens/PiecePreview.jsx';

// Pieces dragged in from outside the map — from the Pieces panel, a placement
// dialog or the initiative strip (pointer events), or a character dragged with
// native drag and drop: where they would land, and dropping them there.
export function usePiecePlacement({
  hostRef,
  view,
  grid,
  screenPoint,
  cellPoint,
  snapObjects,
  placementDrag,
  backgroundOnly,
  onDropPlacement,
  onDropCharacter,
}) {
  const [placementHover, setPlacementHover] = useState(null);

  useEffect(() => {
    if (!placementDrag || backgroundOnly) setPlacementHover(null);
  }, [backgroundOnly, placementDrag]);

  // Where a dragged-in piece would land, centred under the pointer. Only an
  // object may come to rest between squares: a creature, an imported fight and a
  // character are laid out in whole cells by the code that receives them.
  const placementPosition = useCallback((event, placement = placementDrag) => {
    const world = screenToWorld(screenPoint(event), view);
    const w = Math.max(1, Number(placement?.token?.w) || 1);
    const h = Math.max(1, Number(placement?.token?.h) || 1);
    const free = placement?.kind === 'object' && !snapObjects;

    // A hex piece stands on a hex, so the pointer is already its centre: none of
    // the half-span shifting a square grid needs to centre a 2x2.
    if (isHexGrid(grid)) {
      const axial = worldToAxial(world, grid);
      const cell = free ? axial : axialRound(axial);
      return { x: cell.q, y: cell.r };
    }

    if (free) {
      const at = cellPoint(screenPoint(event));
      return { x: at.x - w / 2, y: at.y - h / 2 };
    }
    const cell = worldToCell(world, grid);
    return { x: cell.col - Math.floor(w / 2), y: cell.row - Math.floor(h / 2) };
  }, [cellPoint, placementDrag, grid, screenPoint, snapObjects, view]);

  // Placement arrives through pointer events so mouse, touch and pen share the
  // same reliable path instead of depending on native HTML drag-and-drop.
  // Listening on the window lets a drag cross the floating tool panel or a
  // placement dialog before it reaches the map beneath.
  useEffect(() => {
    const handlePointerPlacement = (event) => {
      const detail = event.detail;
      const host = hostRef.current;
      if (!detail?.placement || !host) return;
      if (detail.phase === 'cancel') {
        setPlacementHover(null);
        return;
      }

      const box = host.getBoundingClientRect();
      const inside = detail.clientX >= box.left && detail.clientX <= box.right
        && detail.clientY >= box.top && detail.clientY <= box.bottom;
      if (!inside || backgroundOnly) {
        setPlacementHover(null);
        return;
      }

      const pointer = { clientX: detail.clientX, clientY: detail.clientY };
      const next = placementPosition(pointer, detail.placement);
      if (detail.phase === 'drop') {
        setPlacementHover(null);
        onDropPlacement?.(detail.placement, next);
        return;
      }
      setPlacementHover((current) => (
        current?.x === next.x && current?.y === next.y ? current : next
      ));
    };

    window.addEventListener(PIECE_POINTER_DRAG_EVENT, handlePointerPlacement);
    return () => window.removeEventListener(PIECE_POINTER_DRAG_EVENT, handlePointerPlacement);
  }, [backgroundOnly, hostRef, onDropPlacement, placementPosition]);

  // Native drag and drop onto the map host.
  const dragHandlers = {
    onDragOver: (event) => {
      if (backgroundOnly) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      if (!placementDrag && !onDropCharacter) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (!placementDrag) return;
      const next = placementPosition(event);
      setPlacementHover((current) => (
        current?.x === next.x && current?.y === next.y ? current : next
      ));
    },
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setPlacementHover(null);
    },
    onDrop: (event) => {
      if (backgroundOnly) {
        event.preventDefault();
        setPlacementHover(null);
        return;
      }
      if (!onDropPlacement && !onDropCharacter) return;
      event.preventDefault();
      if (placementDrag && onDropPlacement) {
        const position = placementHover || placementPosition(event);
        setPlacementHover(null);
        onDropPlacement(placementDrag, position);
        return;
      }
      if (!onDropCharacter) return;
      const characterId = event.dataTransfer.getData('application/x-gb-character');
      if (!characterId) return;
      // Drop where the pointer is, centred on the piece rather than hanging
      // off its top-left corner.
      const world = screenToWorld(screenPoint(event), view);
      const cell = worldToCell(world, grid);
      onDropCharacter(characterId, { x: cell.col, y: cell.row });
    },
  };

  return { placementHover, dragHandlers };
}
