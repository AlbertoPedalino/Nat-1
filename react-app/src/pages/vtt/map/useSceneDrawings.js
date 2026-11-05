import { useCallback, useMemo, useState } from 'react';
import { createDrawing, deleteDrawing, moveDrawing, updateDrawing } from '../../../shared/cloud/api/vtt.js';
import { applyCommittedDrawing } from '../../../shared/vtt/session/liveScene.js';
import { canEraseDrawing, canMoveDrawing, drawingAtPoint, lastDrawing, movedPoints, sanitizeNoteText } from '../../../shared/vtt/map/drawing.js';
import { areaEffect } from '../../../shared/vtt/map/areas.js';

// The scene's marks: freehand strokes, areas of effect, text notes and their
// menu (label, colour, size, visibility), erasing, moving and undoing them, plus
// the ruler and laser pointer broadcast to the other screens.
export function useSceneDrawings({
  scene, role, user, notify, activeLayer, drawColor, drawWidth, setDrawColor,
  setAreaOptions, drawings, setDrawings, beginDrawingWrite, reconcileContent, sendDrag,
  setLasers,
}) {
  const handleDrawEnd = useCallback(async (points) => {
    try {
      const created = await createDrawing(scene.id, {
        points,
        color: drawColor,
        width: drawWidth,
        layer: role.isGm ? activeLayer : 'tokens',
      });
      if (created) setDrawings((current) => [...current, created]);
    } catch (cause) {
      notify('error', cause?.message || 'Could not save that stroke.');
    }
  }, [activeLayer, drawColor, drawWidth, notify, role.isGm, scene.id]);

  const removeDrawing = useCallback(async (drawing) => {
    if (!drawing) return;
    setDrawings((current) => current.filter((item) => item.id !== drawing.id));
    try {
      await deleteDrawing(drawing.id);
    } catch (cause) {
      setDrawings((current) => [...current, drawing]);
      notify('error', cause?.message || 'Could not remove that stroke.');
    }
  }, [notify]);

  // Only what this person is allowed to rub out, so the eraser never sits on a
  // stroke it cannot take and looks broken.
  const erasable = useMemo(
    () => drawings.filter((drawing) => canEraseDrawing(drawing, { isGm: role.isGm, userId: user?.id })),
    [drawings, role.isGm, user?.id],
  );

  const handleErase = useCallback((point) => {
    removeDrawing(drawingAtPoint(erasable, point));
  }, [erasable, removeDrawing]);

  // What is under the pointer and yours to pick up. The same rule as the
  // eraser's, so nothing offers itself to be dragged and then refuses to move.
  const movableDrawing = useCallback((point) => (
    drawingAtPoint(
      drawings.filter((drawing) => canMoveDrawing(drawing, { isGm: role.isGm, userId: user?.id })),
      // An area is picked up from anywhere inside it (user request): the map
      // still pans from outside it, or with the middle button or two fingers.
      point,
    )
  ), [drawings, role.isGm, user?.id]);

  const handleMoveDrawing = useCallback(async (drawing, offset) => {
    const points = movedPoints(drawing, offset.x, offset.y);
    // Shown where it was dropped straight away; the row catches up.
    setDrawings((current) => current.map((item) => (
      item.id === drawing.id ? { ...item, points } : item
    )));
    const finishWrite = beginDrawingWrite(drawing.id);
    let committed = null;
    try {
      committed = await moveDrawing(drawing.id, points);
    } catch (cause) {
      setDrawings((current) => current.map((item) => (
        item.id === drawing.id ? drawing : item
      )));
      notify('error', cause?.message || 'Could not move that mark.');
    } finally {
      // Echoes of this mark waited while it was being written; the last
      // write's answer is the row now.
      if (finishWrite() && committed) setDrawings((current) => applyCommittedDrawing(current, committed));
    }
  }, [beginDrawingWrite, notify]);

  // An area of effect is a mark too: one row, same undo and eraser.
  const handlePlaceArea = useCallback(async ({ points, area, text }) => {
    try {
      const created = await createDrawing(scene.id, {
        points,
        area,
        text,
        color: drawColor,
        width: drawWidth,
        layer: role.isGm ? activeLayer : 'tokens',
      });
      if (created) setDrawings((current) => [...current, created]);
    } catch (cause) {
      notify('error', cause?.message || 'Could not place that area.');
    }
  }, [activeLayer, drawColor, drawWidth, notify, role.isGm, scene.id]);

  // The mark's own menu (right click, or a long press on a touch screen).
  // Changes show at once; a refused write re-reads the marks rather than
  // guessing what the row holds now.
  const [drawingMenu, setDrawingMenu] = useState(null);
  const menuDrawing = useMemo(
    () => drawings.find((drawing) => drawing.id === drawingMenu?.drawingId) || null,
    [drawingMenu, drawings],
  );

  // What a right click or a long press opens: anything of yours under the
  // pointer, an area from anywhere inside it.
  const drawingForMenu = useCallback((point) => (
    drawingAtPoint(
      drawings.filter((drawing) => canMoveDrawing(drawing, { isGm: role.isGm, userId: user?.id })),
      point,
    )
  ), [drawings, role.isGm, user?.id]);

  const handlePreviewDrawing = useCallback((drawing, patch) => {
    setDrawings((current) => current.map((item) => (item.id === drawing.id ? { ...item, ...patch } : item)));
  }, [setDrawings]);

  const handleSaveDrawing = useCallback(async (drawing, patch) => {
    handlePreviewDrawing(drawing, patch);
    const finishWrite = beginDrawingWrite(drawing.id);
    let committed = null;
    try {
      committed = await updateDrawing(drawing.id, patch);
      return true;
    } catch (cause) {
      notify('error', cause?.message || 'Could not change that mark.');
      reconcileContent({ fullDrawings: true });
      return false;
    } finally {
      // As for a move: a colour picked twice in a row must not flash back to
      // the first one when its echo lands after the second write.
      if (finishWrite() && committed) setDrawings((current) => applyCommittedDrawing(current, committed));
    }
  }, [beginDrawingWrite, handlePreviewDrawing, notify, reconcileContent, setDrawings]);

  const handleDrawingVisibility = useCallback(async (drawing, hidden) => {
    if (await handleSaveDrawing(drawing, { hiddenFromPlayers: Boolean(hidden) })) {
      sendDrag({ drawingsChanged: true });
    }
  }, [handleSaveDrawing, sendDrag]);

  // Picking an effect suggests its colour for the outline; the colour can still
  // be changed afterwards.
  const handleAreaOptionsChange = useCallback((patch) => {
    setAreaOptions((current) => ({ ...current, ...patch }));
    const effect = patch.effect ? areaEffect(patch.effect) : null;
    if (effect) setDrawColor(effect.color);
  }, []);

  // A note is a stroke with words on it, so it takes the same path: same table,
  // same visibility rules, same undo and eraser.
  const handleWriteNote = useCallback(async (point) => {
    const text = sanitizeNoteText(window.prompt('Write on the map'));
    if (!text) return;
    try {
      const created = await createDrawing(scene.id, {
        points: [point],
        text,
        color: drawColor,
        width: drawWidth,
        layer: role.isGm ? activeLayer : 'tokens',
      });
      if (created) setDrawings((current) => [...current, created]);
    } catch (cause) {
      notify('error', cause?.message || 'Could not write that note.');
    }
  }, [activeLayer, drawColor, drawWidth, notify, role.isGm, scene.id]);

  // The laser is a finger pointing at the map: broadcast only, never written
  // down, and it fades on its own so a dropped connection cannot leave a dot
  // burning on someone's screen.
  const handleMeasure = useCallback((next) => {
    sendDrag({ measure: next });
  }, [sendDrag]);

  const handleLaser = useCallback((point) => {
    sendDrag({ laser: point ? { x: point.x, y: point.y } : null });
    setLasers((current) => {
      const id = user?.id || 'me';
      if (!point) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      // No label on your own: you know where your own hand is, and a name stuck
      // to your cursor is only in the way.
      return { ...current, [id]: { x: point.x, y: point.y, at: Date.now(), label: null, local: true } };
    });
  }, [sendDrag, user?.id]);

  const handleUndoDrawing = useCallback(() => {
    removeDrawing(lastDrawing(erasable));
  }, [erasable, removeDrawing]);

  return {
    handleDrawEnd, removeDrawing, erasable, handleErase, movableDrawing, handleMoveDrawing,
    handlePlaceArea, drawingMenu, setDrawingMenu, menuDrawing, drawingForMenu,
    handlePreviewDrawing, handleSaveDrawing, handleDrawingVisibility,
    handleAreaOptionsChange, handleWriteNote, handleMeasure, handleLaser, handleUndoDrawing,
  };
}
