import { useEffect, useRef, useState } from 'react';
import { measureLabel, snapRuler } from '../../../shared/vtt/map/measure.js';
import { createMeasurePublisher } from '../../../shared/vtt/map/measureSync.js';
import { gridShape, isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import { overlandMiles } from './viewportGeometry.js';

// The ruler tool: dragged out on this screen and shown to the table while it
// is being dragged. Nothing is written down; it disappears on release.
export function useRuler({
  dragRef, paintMode, cellPoint, grid, measureShape, feetPerCellForRuler, onMeasure,
}) {
  const [measure, setMeasure] = useState(null);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;
  const measurePublisherRef = useRef(null);
  if (!measurePublisherRef.current) {
    measurePublisherRef.current = createMeasurePublisher({ send: (value) => onMeasureRef.current?.(value) });
  }

  // Putting the ruler down — another tool, or the map closing — takes it off
  // everyone else's screen too.
  useEffect(() => {
    if (paintMode === 'measure') return;
    if (dragRef.current?.kind === 'measure') {
      dragRef.current = null;
      setMeasure(null);
    }
    measurePublisherRef.current.finish();
  }, [dragRef, paintMode]);
  useEffect(() => () => measurePublisherRef.current.finish(), []);

  // Answers whether the press started the ruler.
  const beginGesture = (point) => {
    if (paintMode !== 'measure') return false;
    const at = snapRuler(measureShape, cellPoint(point), cellPoint(point), { hex: isHexGrid(grid) }).from;
    dragRef.current = { kind: 'measure', from: at };
    setMeasure({ shape: measureShape, from: at, to: at, label: '' });
    return true;
  };

  const moveGesture = (state, point) => {
    if (state.kind !== 'measure') return false;
    const { to: at } = snapRuler(measureShape, state.from, cellPoint(point), { hex: isHexGrid(grid) });
    const next = {
      shape: measureShape,
      from: state.from,
      to: at,
      // The ruler is told what it is measuring across: on hexes a step is a
      // step, and a scene with a mile scale answers in miles.
      label: measureLabel(measureShape, state.from, at, {
        feetPerCell: feetPerCellForRuler,
        milesPerCell: overlandMiles(grid),
        shape: gridShape(grid),
      }),
    };
    setMeasure(next);
    // Shown to the table as it is dragged, like the laser: measuring out loud
    // is half the point of measuring. Locally every move redraws; the table
    // gets a throttled, de-duplicated stream (measureSync.js).
    measurePublisherRef.current.update(next);
    return true;
  };

  // The ruler disappears on release; nothing is written down.
  const endGesture = (state) => {
    if (state.kind !== 'measure') return false;
    setMeasure(null);
    measurePublisherRef.current.finish();
    return true;
  };

  const cancel = () => {
    setMeasure(null);
    measurePublisherRef.current.finish();
  };

  return {
    measure, beginGesture, moveGesture, endGesture, cancel,
  };
}
