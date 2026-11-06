import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  Box,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Cloud,
  CircleDashed,
  Eraser,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  Pencil,
  Circle,
  Pointer,
  Ruler,
  Square,
  SquareDashedMousePointer,
  Triangle,
  Type,
  Undo2,
  Users,
} from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import { pillLabelSx, colorInputSx } from './panelStyles.js';
import AreaEffectSelect from '../map/AreaEffectSelect.jsx';
import { gridCellWord } from '../../../shared/vtt/map/hexGeometry.js';

// The scene's settings, split by the question they answer. Each one is a panel
// behind its own icon on the rail rather than a strip across the top: the map is
// the page, and controls laid over it have to be summoned, not endured.

export function LayerPanel({ activeLayer, compact = false, onActiveLayerChange }) {
  const buttons = (
    <ToggleButtonGroup
      size="small"
      exclusive
      fullWidth={!compact}
      value={activeLayer}
      onChange={(_, value) => onActiveLayerChange(value || activeLayer)}
      aria-label="Active layer"
      sx={compact ? compactLayerSx : null}
    >
      <Tooltip title="Map: scenery and props">
        <ToggleButton value="map" aria-label="Map layer"><ImageIcon size={14} /></ToggleButton>
      </Tooltip>
      <Tooltip title="Tokens: the pieces everyone sees">
        <ToggleButton value="tokens" aria-label="Token layer"><Users size={14} /></ToggleButton>
      </Tooltip>
      <Tooltip title="GM: never sent to the players">
        <ToggleButton value="gm" aria-label="GM layer"><EyeOff size={14} /></ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );

  if (compact) return buttons;

  return (
    <Stack spacing={1}>
      {buttons}
      <Typography variant="caption" color="text.secondary">
        Pieces on the other layers stay visible but cannot be moved, so arranging
        the party never nudges the scenery. The GM layer is never sent to players.
      </Typography>
    </Stack>
  );
}

const compactLayerSx = {
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.85),
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.35)}`,
  '& .MuiToggleButton-root': { color: VTT_COLORS.railText, border: 0, px: 1 },
  '& .Mui-selected': { color: VTT_COLORS.ink, bgcolor: VTT_COLORS.gold },
};

export function FogPanel({ scene, busy, paintMode, brushSize, onEnableFog, onPaintModeChange, onBrushSizeChange, onFogAll }) {
  if (!scene.fog) {
    return (
      <Stack spacing={1}>
        <Button size="small" variant="outlined" startIcon={<Cloud size={15} />} disabled={busy} onClick={onEnableFog}>
          Cover the map
        </Button>
        <Typography variant="caption" color="text.secondary">
          Sized to the map image, and revealed with the brush as the party explores.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <ToggleButtonGroup
        size="small"
        exclusive
        fullWidth
        value={paintMode === 'reveal' || paintMode === 'hide' ? paintMode : null}
        onChange={(_, value) => onPaintModeChange(value || 'select')}
        aria-label="Fog tool"
      >
        <ToggleButton value="reveal" aria-label="Reveal fog"><Eye size={14} /></ToggleButton>
        <ToggleButton value="hide" aria-label="Cover with fog"><EyeOff size={14} /></ToggleButton>
      </ToggleButtonGroup>
      <TextField
        label="Brush (cells)"
        size="small"
        type="number"
        value={brushSize}
        onChange={(event) => onBrushSizeChange(Number(event.target.value))}
        slotProps={{ htmlInput: { min: 1 / Math.max(1, scene.fog.scale || 1), step: 'any' } }}
      />
      <Stack direction="row" spacing={1}>
        <Button size="small" fullWidth onClick={() => onFogAll(true)} disabled={busy}>Reveal all</Button>
        <Button size="small" fullWidth onClick={() => onFogAll(false)} disabled={busy}>Cover all</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        While a brush is selected the left button paints and the middle one pans.
      </Typography>
    </Stack>
  );
}

// Shared by both audiences: drawing and notes are everyone's. The laser is its
// own tool — it leaves nothing behind, so it does not belong beside the ones
// that do.
export function DrawPanel({
  busy, paintMode, drawColor, drawWidth, canUndo, areaOptions, feetPerCell = 5, gridShape = 'square',
  onPaintModeChange, onDrawColorChange, onDrawWidthChange, onUndoDrawing, onAreaOptionsChange,
  onFeetPerCellChange,
}) {
  const DRAW_MODES = ['draw', 'area', 'erase', 'text'];

  return (
    <Stack spacing={1}>
      <ToggleButtonGroup
        size="small"
        exclusive
        fullWidth
        value={DRAW_MODES.includes(paintMode) ? paintMode : null}
        onChange={(_, value) => onPaintModeChange(value || 'select')}
        aria-label="Drawing tool"
      >
        <Tooltip title="Draw"><ToggleButton value="draw" aria-label="Draw"><Pencil size={14} /></ToggleButton></Tooltip>
        <Tooltip title="Mark an area of effect">
          <ToggleButton value="area" aria-label="Area"><CircleDashed size={14} /></ToggleButton>
        </Tooltip>
        <Tooltip title="Erase your strokes">
          <ToggleButton value="erase" aria-label="Erase"><Eraser size={14} /></ToggleButton>
        </Tooltip>
        <Tooltip title="Write on the map">
          <ToggleButton value="text" aria-label="Write"><Type size={14} /></ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>

      {paintMode === 'area' && areaOptions ? (
        <AreaOptions
          options={areaOptions}
          feetPerCell={feetPerCell}
          gridShape={gridShape}
          onChange={onAreaOptionsChange}
          onFeetPerCellChange={onFeetPerCellChange}
        />
      ) : null}

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <ColorField
          value={drawColor}
          onChange={onDrawColorChange}
          deferMs={180}
          label="Ink colour"
          sx={colorInputSx}
        />
        <TextField
          label="Size"
          size="small"
          type="number"
          value={drawWidth}
          onChange={(event) => onDrawWidthChange(Number(event.target.value))}
          sx={{ flex: 1 }}
        />
        <Tooltip title="Undo your last mark">
          <span>
            <Button size="small" onClick={onUndoDrawing} disabled={busy || !canUndo}>
              <Undo2 size={15} />
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Button
        size="small"
        variant={paintMode === 'select' ? 'contained' : 'outlined'}
        startIcon={<MousePointer2 size={14} />}
        onClick={() => onPaintModeChange('select')}
      >
        Back to moving pieces
      </Button>
    </Stack>
  );
}

// What the next area will be. Its size is dragged out on the map a square at a
// time, so the panel asks only what one square is worth — the same number the
// ruler uses, changed in either place.
function AreaOptions({ options, feetPerCell, gridShape, onChange, onFeetPerCellChange }) {
  const cellWord = gridCellWord(gridShape);
  const feetField = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  };

  return (
    <Stack spacing={1}>
      <ToggleButtonGroup
        size="small"
        exclusive
        fullWidth
        value={options.shape}
        onChange={(_, value) => value && onChange?.({ shape: value })}
        aria-label="Area shape"
      >
        <Tooltip title="Circle"><ToggleButton value="circle" aria-label="Circle"><Circle size={14} /></ToggleButton></Tooltip>
        <Tooltip title="Square"><ToggleButton value="square" aria-label="Square"><Square size={14} /></ToggleButton></Tooltip>
        <Tooltip title="Cone"><ToggleButton value="cone" aria-label="Cone"><Triangle size={14} /></ToggleButton></Tooltip>
        <Tooltip title="Line"><ToggleButton value="line" aria-label="Line"><Minus size={14} /></ToggleButton></Tooltip>
      </ToggleButtonGroup>

      {/* An effect paints the inside itself, so outline or fill only matters
          for a plain area. */}
      <ToggleButtonGroup
        size="small"
        exclusive
        fullWidth
        value={options.filled || options.effect ? 'filled' : 'outline'}
        disabled={Boolean(options.effect)}
        onChange={(_, value) => value && onChange?.({ filled: value === 'filled' })}
        aria-label="Area fill"
      >
        <ToggleButton value="outline" aria-label="Outline only">Outline</ToggleButton>
        <ToggleButton value="filled" aria-label="Filled">Filled</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={1}>
        <TextField
          label={`Feet per ${cellWord}`}
          size="small"
          type="number"
          value={feetPerCell}
          disabled={!onFeetPerCellChange}
          onChange={(event) => onFeetPerCellChange?.(Number(event.target.value))}
          slotProps={{ htmlInput: { min: 0, step: 5 } }}
          sx={{ flex: 1 }}
        />
        {options.shape === 'line' ? (
          <TextField
            label="Width (ft)"
            size="small"
            type="number"
            value={options.breadthFt}
            onChange={(event) => onChange?.({ breadthFt: feetField(event.target.value) })}
            slotProps={{ htmlInput: { min: 0, step: 5 } }}
            sx={{ flex: 1 }}
          />
        ) : null}
      </Stack>

      <AreaEffectSelect value={options.effect} onChange={(effect) => onChange?.({ effect })} />

      <TextField
        label="Label"
        size="small"
        placeholder="Spirit Guardians"
        value={options.label}
        onChange={(event) => onChange?.({ label: event.target.value })}
        slotProps={{ htmlInput: { maxLength: 120 } }}
      />

      <Typography variant="caption" color="text.secondary">
        {`Press where it starts and drag it out, one ${cellWord} (${feetPerCell} ft) at a time; a cone or a line faces where you drag. Right-click it (or hold it on a touch screen) to change it later.`}
      </Typography>
    </Stack>
  );
}

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
        <Tooltip title="Distance"><ToggleButton value="line" aria-label="Distance"><Ruler size={14} /></ToggleButton></Tooltip>
        <Tooltip title="Radius"><ToggleButton value="radius" aria-label="Radius"><Circle size={14} /></ToggleButton></Tooltip>
        <Tooltip title="Cone"><ToggleButton value="cone" aria-label="Cone"><Triangle size={14} /></ToggleButton></Tooltip>
        <Tooltip title="Square"><ToggleButton value="square" aria-label="Square"><Square size={14} /></ToggleButton></Tooltip>
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

      <Typography variant="caption" color="text.secondary">
        {miles
          ? `Drag from the origin. Distance is counted in ${cellPlural} — on hexes every neighbour is one step, which is what travel time is reckoned in.`
          : 'Drag from the origin. A 5e cone is as wide at the far end as it is long, and a diagonal counts as one square — three across and two down is 15 ft.'}
      </Typography>

      <Button
        size="small"
        variant={paintMode === 'measure' ? 'contained' : 'outlined'}
        startIcon={<Ruler size={14} />}
        onClick={() => onPaintModeChange(paintMode === 'measure' ? 'select' : 'measure')}
      >
        {paintMode === 'measure' ? 'Put the ruler away' : 'Take the ruler'}
      </Button>
    </Stack>
  );
}

// The cursor and the rectangle are two ways of picking up the same pieces, so
// they share one rail button: the plain pointer, or a box drawn around several.
export function CursorPanel({ paintMode, onPaintModeChange }) {
  const boxSelect = paintMode === 'marquee';
  return (
    <Stack spacing={1}>
      <ToggleButtonGroup
        size="small"
        exclusive
        fullWidth
        value={boxSelect ? 'marquee' : 'select'}
        onChange={(_, value) => value && onPaintModeChange(value)}
        aria-label="Cursor mode"
      >
        <ToggleButton value="select" aria-label="Pointer">
          <MousePointer2 size={14} />
          <Box component="span" sx={pillLabelSx}>Pointer</Box>
        </ToggleButton>
        <ToggleButton value="marquee" aria-label="Box select">
          <SquareDashedMousePointer size={14} />
          <Box component="span" sx={pillLabelSx}>Box select</Box>
        </ToggleButton>
      </ToggleButtonGroup>
      <Typography variant="caption" color="text.secondary">
        {boxSelect
          ? 'Drag a rectangle over pieces you can control. Drag any selected piece to move the group; hold Shift or Ctrl to add another area. Use Delete or Backspace to remove it, and Escape to clear.'
          : 'Drag a piece to move it. Right-click a piece for its label and conditions.'}
      </Typography>
    </Stack>
  );
}

// Its own tool rather than a fourth pencil: everything in the drawing panel
// leaves a row behind, and this leaves nothing at all.
export function LaserPanel({ paintMode, onPaintModeChange }) {
  const active = paintMode === 'laser';
  return (
    <Stack spacing={1}>
      <Button
        size="small"
        variant={active ? 'contained' : 'outlined'}
        startIcon={<Pointer size={15} />}
        onClick={() => onPaintModeChange(active ? 'select' : 'laser')}
      >
        {active ? 'Put the pointer down' : 'Take the pointer'}
      </Button>
      <Typography variant="caption" color="text.secondary">
        Once selected, the whole table sees the dot follow your cursor. Choose
        Cursor or another tool to put it away. It is never saved.
      </Typography>
    </Stack>
  );
}
