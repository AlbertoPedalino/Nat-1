import { Button, Stack, TextField, Tooltip } from '@mui/material';
import {
  CircleDashed,
  Eraser,
  Minus,
  MousePointer2,
  Pencil,
  Circle,
  Square,
  Triangle,
  Type,
  Undo2,
} from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import AreaEffectSelect from '../map/AreaEffectSelect.jsx';
import { gridCellWord } from '../../../shared/vtt/map/hexGeometry.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Caption from '../../../shared/ui/Caption.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

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
      <ChoiceToggle
        fullWidth
        allowClear
        ariaLabel="Drawing tool"
        value={DRAW_MODES.includes(paintMode) ? paintMode : null}
        onChange={(value) => onPaintModeChange(value || 'select')}
        options={[
          { value: 'draw', icon: Pencil, tooltip: 'Draw', ariaLabel: 'Draw' },
          { value: 'area', icon: CircleDashed, tooltip: 'Mark an area of effect', ariaLabel: 'Area' },
          { value: 'erase', icon: Eraser, tooltip: 'Erase your strokes', ariaLabel: 'Erase' },
          { value: 'text', icon: Type, tooltip: 'Write on the map', ariaLabel: 'Write' },
        ]}
      />

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
          size={34}
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
              <Undo2 size={ICON_SIZES.sm} />
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Button
        size="small"
        variant={paintMode === 'select' ? 'contained' : 'outlined'}
        startIcon={<MousePointer2 size={ICON_SIZES.sm} />}
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
export function AreaOptions({ options, feetPerCell, gridShape, onChange, onFeetPerCellChange }) {
  const cellWord = gridCellWord(gridShape);
  const feetField = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  };

  return (
    <Stack spacing={1}>
      <ChoiceToggle
        fullWidth
        ariaLabel="Area shape"
        value={options.shape}
        onChange={(shape) => onChange?.({ shape })}
        options={[
          { value: 'circle', icon: Circle, tooltip: 'Circle' },
          { value: 'square', icon: Square, tooltip: 'Square' },
          { value: 'cone', icon: Triangle, tooltip: 'Cone' },
          { value: 'line', icon: Minus, tooltip: 'Line' },
        ]}
      />

      {/* An effect paints the inside itself, so outline or fill only matters
          for a plain area. */}
      <ChoiceToggle
        fullWidth
        ariaLabel="Area fill"
        value={options.filled || options.effect ? 'filled' : 'outline'}
        disabled={Boolean(options.effect)}
        onChange={(value) => onChange?.({ filled: value === 'filled' })}
        options={[
          { value: 'outline', label: 'Outline', ariaLabel: 'Outline only' },
          { value: 'filled', label: 'Filled' },
        ]}
      />

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

      <Caption>
        {`Press where it starts and drag it out, one ${cellWord} (${feetPerCell} ft) at a time; a cone or a line faces where you drag. Right-click it (or hold it on a touch screen) to change it later.`}
      </Caption>
    </Stack>
  );
}
