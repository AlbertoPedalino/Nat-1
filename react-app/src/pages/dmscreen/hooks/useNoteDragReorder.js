import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { resolveDropIndex } from '../logic/notes.js';
import {
  FLIP_DURATION_MS,
  dragTranslate,
  flipOffsets,
  grabOffsetFor,
} from '../logic/dragMotion.js';
import { clearOffset, writeOffset } from './dragStyles.js';

// Pointer-events drag reorder: works with mouse, pen, and touch without pulling
// in a drag-and-drop dependency. The dragged card is moved by writing custom
// properties on its DOM node — no React state per pointer move — and the cards
// it displaces slide into their new slots with a FLIP animation, so the board
// behaves like a phone home screen instead of snapping between layouts.
//
// Measuring is the expensive half, so it is kept off the pointer path entirely:
// every card's untransformed rectangle is cached, and the cache is refreshed
// only when the layout can actually have changed (drag start, a reorder, a
// scroll or resize mid-drag). A pointer move is then pure arithmetic plus three
// custom-property writes, which cost no layout flush.
export function useNoteDragReorder({ notes, onReorder, onDrop }) {
  const cardsRef = useRef(new Map());
  // { id, pointer, grabOffset } while a drag is in flight.
  const dragRef = useRef(null);
  // id -> rectangle the card owns with no drag offset applied.
  const naturalRef = useRef(new Map());
  // The cache as it was before a reorder: the "First" half of the FLIP.
  const flipRef = useRef(null);
  const frameRef = useRef(0);
  const [draggingId, setDraggingId] = useState(null);

  const registerCard = useCallback((id, element) => {
    if (element) cardsRef.current.set(id, element);
    else cardsRef.current.delete(id);
  }, []);

  // Offsets are wiped before measuring so every rectangle is the slot the card
  // really owns rather than wherever an in-flight animation left it. The drag
  // offset is written back in the same task, so nothing blinks.
  const measureNatural = useCallback(() => {
    const natural = new Map();
    cardsRef.current.forEach((element) => clearOffset(element));
    cardsRef.current.forEach((element, id) => natural.set(id, element.getBoundingClientRect()));
    naturalRef.current = natural;
    return natural;
  }, []);

  const paintDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    const element = cardsRef.current.get(drag.id);
    const natural = naturalRef.current.get(drag.id);
    if (!element || !natural) return;
    const { x, y } = dragTranslate(drag.pointer, drag.grabOffset, natural);
    writeOffset(element, x, y);
  }, []);

  // Play the FLIP once React has committed the new order, then re-pin the
  // dragged card, whose own slot has just moved too.
  useLayoutEffect(() => {
    const previous = flipRef.current;
    flipRef.current = null;
    // Outside a drag there is nothing to animate and nothing to keep fresh, so
    // ordinary edits never pay for a measuring pass.
    if (!previous && !dragRef.current) return undefined;

    const natural = measureNatural();
    paintDrag();
    if (!previous) return undefined;

    const offsets = flipOffsets(previous, natural, dragRef.current?.id);
    if (offsets.size === 0) return undefined;
    offsets.forEach(({ dx, dy }, id) => writeOffset(cardsRef.current.get(id), dx, dy));

    frameRef.current = requestAnimationFrame(() => {
      offsets.forEach((_, id) => clearOffset(cardsRef.current.get(id), FLIP_DURATION_MS));
    });
    return () => cancelAnimationFrame(frameRef.current);
  }, [notes, measureNatural, paintDrag]);

  // A page scroll or a window resize moves every cached rectangle at once.
  useEffect(() => {
    if (!draggingId) return undefined;
    const refresh = () => {
      measureNatural();
      paintDrag();
    };
    window.addEventListener('scroll', refresh, true);
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('scroll', refresh, true);
      window.removeEventListener('resize', refresh);
    };
  }, [draggingId, measureNatural, paintDrag]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    setDraggingId(null);
    // Let the card glide back into its slot instead of teleporting there.
    clearOffset(cardsRef.current.get(drag.id), FLIP_DURATION_MS);
    // A press that never reordered anything is not a drop worth reporting.
    if (drag.moved) onDrop?.(drag.id);
  }, [onDrop]);

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.pointer = { x: event.clientX, y: event.clientY };
    paintDrag();

    const fromIndex = notes.findIndex((note) => note.id === drag.id);
    if (fromIndex < 0) return;
    // Drop targets are measured against the slots the cards own, so the dragged
    // card is compared by the hole it left behind and not by the copy riding
    // under the pointer — otherwise it would always resolve to itself.
    const rects = notes.map((note) => naturalRef.current.get(note.id));
    if (rects.some((rect) => !rect)) return;

    const target = resolveDropIndex(rects, drag.pointer, fromIndex);
    if (target === fromIndex) return;
    flipRef.current = naturalRef.current;
    drag.moved = true;
    onReorder(drag.id, target);
  }, [notes, onReorder, paintDrag]);

  // The drag is followed on the window, not on the handle. Reordering moves the
  // card's DOM node, and moving a node releases its pointer capture — so a
  // handle-bound drag dies the moment the note first changes place, which is
  // precisely when the GM is still dragging. Rebinding as `notes` changes also
  // keeps the move handler from closing over a stale order.
  useEffect(() => {
    if (!draggingId) return undefined;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [draggingId, endDrag, handlePointerMove]);

  const getHandleProps = useCallback((id) => ({
    onPointerDown: (event) => {
      // Left button / touch only: right-click and middle-click must not start a drag.
      if (event.button !== 0) return;
      // preventDefault stops text selection mid-drag; it also swallows the click
      // focus, so the handle is focused explicitly to keep arrow-key reordering
      // available right after a drag.
      event.preventDefault();
      event.currentTarget.focus?.();
      const pointer = { x: event.clientX, y: event.clientY };
      const natural = measureNatural().get(id) ?? { left: pointer.x, top: pointer.y };
      dragRef.current = { id, pointer, grabOffset: grabOffsetFor(pointer, natural), moved: false };
      setDraggingId(id);
    },
  }), [measureNatural]);

  return { draggingId, registerCard, getHandleProps };
}
