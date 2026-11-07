import { useState } from 'react';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { DEFAULT_AREA_OPTIONS } from '../../../shared/vtt/map/areas.js';
import { FEET_PER_CELL } from '../../../shared/vtt/map/measure.js';

// The battle map's tool settings, kept while the scene is open: the fog brush,
// the layer being edited, the pen, the next area of effect (kept between
// placements, so a row of fire is a row of clicks) and the ruler.
export function useSceneTools() {
  const [brushSize, setBrushSize] = useState(3);
  const [activeLayer, setActiveLayer] = useState('tokens');
  const [drawColor, setDrawColor] = useState(VTT_COLORS.gold);
  const [drawWidth, setDrawWidth] = useState(3);
  const [areaOptions, setAreaOptions] = useState(DEFAULT_AREA_OPTIONS);
  const [measureShape, setMeasureShape] = useState('line');
  const [feetPerCell, setFeetPerCell] = useState(FEET_PER_CELL);
  return {
    brushSize, setBrushSize, activeLayer, setActiveLayer, drawColor, setDrawColor, drawWidth, setDrawWidth,
    areaOptions, setAreaOptions, measureShape, setMeasureShape, feetPerCell, setFeetPerCell,
  };
}
