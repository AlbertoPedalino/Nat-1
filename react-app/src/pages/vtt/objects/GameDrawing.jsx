import { useEffect, useState } from 'react';
import { CircleDashed } from 'lucide-react';
import { loadGameDrawing } from './gameDrawings.js';

// A game-icons.net drawing on the map, by name: filled in the current colour,
// fetched the first time it is shown (gameDrawings.js). Until it arrives, or if
// it cannot, the dashed circle Lucide's dynamic icons fall back to.
export default function GameDrawing({ name, size }) {
  const [drawing, setDrawing] = useState(null);
  useEffect(() => {
    let live = true;
    setDrawing(null);
    loadGameDrawing(name).then((next) => { if (live) setDrawing(next); }, () => {});
    return () => { live = false; };
  }, [name]);
  if (!drawing) return <CircleDashed width={size} height={size} />;
  return (
    <svg viewBox={drawing.viewBox} width={size} height={size} fill="currentColor" aria-hidden="true">
      {drawing.paths.map((d, index) => <path key={index} d={d} />)}
    </svg>
  );
}
