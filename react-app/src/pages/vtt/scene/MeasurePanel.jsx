import {
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  Circle,
  Ruler,
  Square,
  Triangle,
} from 'lucide-react';
import { gridCellWord } from '../../../shared/vtt/map/hexGeometry.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Caption from '../../../shared/ui/Caption.jsx';

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
      <ToggleButtonGroup
        size="small"
        exclusive
        fullWidth
        value={measureShape}
        onChange={(_, value) => {
          if (!value) return;
          onShapeChange(value);
          onPaintModeChange('measure');
        }}
        aria-label="Ruler shape"
      >
        <Tooltip title="Distance"><ToggleButton value="line" aria-label="Distance"><Ruler size={ICON_SIZES.sm} /></ToggleButton></Tooltip>
        <Tooltip title="Radius"><ToggleButton value="radius" aria-label="Radius"><Circle size={ICON_SIZES.sm} /></ToggleButton></Tooltip>
        <Tooltip title="Cone"><ToggleButton value="cone" aria-label="Cone"><Triangle size={ICON_SIZES.sm} /></ToggleButton></Tooltip>
        <Tooltip title="Square"><ToggleButton value="square" aria-label="Square"><Square size={ICON_SIZES.sm} /></ToggleButton></Tooltip>
      </ToggleButtonGroup>

      {/* Which scale this map is read at, said outright rather than inferred
          from whether a miles box happens to be filled in. A dungeon is feet
          across a square; a wilderness map is miles across a hex, and the ruler
          answers in whichever one is picked. */}
      <ToggleButtonGroup
        size="small"
        exclusive
        fullWidth
        value={miles ? 'miles' : 'feet'}
        disabled={!onMeasureUnitChange}
        onChange={(_, value) => value && onMeasureUnitChange?.(value)}
        aria-label="Measure in"
      >
        <ToggleButton value="feet" aria-label="Measure in feet">Feet</ToggleButton>
        <ToggleButton value="miles" aria-label="Measure in miles">Miles</ToggleButton>
      </ToggleButtonGroup>

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
