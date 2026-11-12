import { Button, Stack, TextField } from '@mui/material';
import {
  Circle,
  Ruler,
  Square,
  Triangle,
} from 'lucide-react';
import { gridCellWord } from '../../../shared/vtt/map/hexGeometry.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Caption from '../../../shared/ui/Caption.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

// The 5e templates, the way Roll20 offers them: pick a shape, then drag from
// the origin. The number is the same for all of them — how far it reaches —
// which is why the panel is a shape picker and not four separate tools.
export function MeasurePanel({
  paintMode, measureShape, feetPerCell, gridShape = 'square', milesPerCell = 6,
  measureUnit = 'feet',
  onPaintModeChange, onShapeChange, onFeetPerCellChange, onMilesPerCellChange,
  onMeasureUnitChange,
}) {
  const cellWord = gridCellWord(gridShape);
  const cellPlural = gridCellWord(gridShape, { plural: true });
  const miles = measureUnit === 'miles';
  return (
    <Stack spacing={1}>
      <ChoiceToggle
        fullWidth
        ariaLabel="Ruler shape"
        value={measureShape}
        onChange={(value) => {
          onShapeChange(value);
          onPaintModeChange('measure');
        }}
        options={[
          { value: 'line', icon: Ruler, tooltip: 'Distance' },
          { value: 'radius', icon: Circle, tooltip: 'Radius' },
          { value: 'cone', icon: Triangle, tooltip: 'Cone' },
          { value: 'square', icon: Square, tooltip: 'Square' },
        ]}
      />

      {/* Which scale this map is read at, said outright rather than inferred
          from whether a miles box happens to be filled in. A dungeon is feet
          across a square; a wilderness map is miles across a hex, and the ruler
          answers in whichever one is picked. */}
      <ChoiceToggle
        fullWidth
        ariaLabel="Measure in"
        value={miles ? 'miles' : 'feet'}
        disabled={!onMeasureUnitChange}
        onChange={(value) => onMeasureUnitChange?.(value)}
        options={[
          { value: 'feet', label: 'Feet', ariaLabel: 'Measure in feet' },
          { value: 'miles', label: 'Miles', ariaLabel: 'Measure in miles' },
        ]}
      />

      {miles ? (
        <TextField
          label={`Miles per ${cellWord}`}
          size="small"
          type="number"
          value={milesPerCell}
          disabled={!onMilesPerCellChange}
          helperText={`The ruler answers in miles, and says how many ${cellPlural} that was.`}
          onChange={(event) => onMilesPerCellChange?.(Number(event.target.value))}
          slotProps={{ htmlInput: { min: 0.1, step: 0.5 } }}
        />
      ) : (
        <TextField
          label={`Feet per ${cellWord}`}
          size="small"
          type="number"
          value={feetPerCell}
          onChange={(event) => onFeetPerCellChange(Number(event.target.value))}
        />
      )}

      <Caption>
        {miles
          ? `Drag from the origin. Distance is counted in ${cellPlural} — on hexes every neighbour is one step, which is what travel time is reckoned in.`
          : 'Drag from the origin. A 5e cone is as wide at the far end as it is long, and a diagonal counts as one square — three across and two down is 15 ft.'}
      </Caption>

      <Button
        size="small"
        variant={paintMode === 'measure' ? 'contained' : 'outlined'}
        startIcon={<Ruler size={ICON_SIZES.sm} />}
        onClick={() => onPaintModeChange(paintMode === 'measure' ? 'select' : 'measure')}
      >
        {paintMode === 'measure' ? 'Put the ruler away' : 'Take the ruler'}
      </Button>
    </Stack>
  );
}
