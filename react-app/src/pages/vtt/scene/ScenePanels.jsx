import { Box, Button, Stack, TextField } from '@mui/material';
import {
  Cloud,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MousePointer2,
  Pointer,
  SquareDashedMousePointer,
  Users,
} from 'lucide-react';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Caption from '../../../shared/ui/Caption.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

// The scene's settings, split by the question they answer. Each one is a panel
// behind its own icon on the rail rather than a strip across the top: the map is
// the page, and controls laid over it have to be summoned, not endured.

export function LayerPanel({ activeLayer, compact = false, onActiveLayerChange }) {
  const buttons = (
    <ChoiceToggle
      fullWidth={!compact}
      onMap={compact}
      ariaLabel="Active layer"
      value={activeLayer}
      onChange={onActiveLayerChange}
      options={[
        { value: 'map', icon: ImageIcon, tooltip: 'Map: scenery and props', ariaLabel: 'Map layer' },
        { value: 'tokens', icon: Users, tooltip: 'Tokens: the pieces everyone sees', ariaLabel: 'Token layer' },
        { value: 'gm', icon: EyeOff, tooltip: 'GM: never sent to the players', ariaLabel: 'GM layer' },
      ]}
    />
  );

  if (compact) return buttons;

  return (
    <Stack spacing={1}>
      {buttons}
      <Caption>
        Pieces on the other layers stay visible but cannot be moved, so arranging
        the party never nudges the scenery. The GM layer is never sent to players.
      </Caption>
    </Stack>
  );
}

export function FogPanel({ scene, busy, paintMode, brushSize, onEnableFog, onPaintModeChange, onBrushSizeChange, onFogAll }) {
  if (!scene.fog) {
    return (
      <Stack spacing={1}>
        <Button size="small" variant="outlined" startIcon={<Cloud size={ICON_SIZES.sm} />} disabled={busy} onClick={onEnableFog}>
          Cover the map
        </Button>
        <Caption>
          Sized to the map image, and revealed with the brush as the party explores.
        </Caption>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <ChoiceToggle
        fullWidth
        allowClear
        ariaLabel="Fog tool"
        value={paintMode === 'reveal' || paintMode === 'hide' ? paintMode : null}
        onChange={(value) => onPaintModeChange(value || 'select')}
        options={[
          { value: 'reveal', icon: Eye, ariaLabel: 'Reveal fog' },
          { value: 'hide', icon: EyeOff, ariaLabel: 'Cover with fog' },
        ]}
      />
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
      <Caption>
        While a brush is selected the left button paints and the middle one pans.
      </Caption>
    </Stack>
  );
}

// The cursor and the rectangle are two ways of picking up the same pieces, so
// they share one rail button: the plain pointer, or a box drawn around several.
export function CursorPanel({ paintMode, onPaintModeChange }) {
  const boxSelect = paintMode === 'marquee';
  return (
    <Stack spacing={1}>
      <ChoiceToggle
        fullWidth
        ariaLabel="Cursor mode"
        value={boxSelect ? 'marquee' : 'select'}
        onChange={onPaintModeChange}
        options={[
          { value: 'select', icon: MousePointer2, label: 'Pointer' },
          { value: 'marquee', icon: SquareDashedMousePointer, label: 'Box select' },
        ]}
      />
      <Caption>
        {boxSelect
          ? 'Drag a rectangle over pieces you can control. Drag any selected piece to move the group; hold Shift or Ctrl to add another area. Use Delete or Backspace to remove it, and Escape to clear.'
          : 'Drag a piece to move it. Right-click a piece for its label and conditions.'}
      </Caption>
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
        startIcon={<Pointer size={ICON_SIZES.sm} />}
        onClick={() => onPaintModeChange(active ? 'select' : 'laser')}
      >
        {active ? 'Put the pointer down' : 'Take the pointer'}
      </Button>
      <Caption>
        Once selected, the whole table sees the dot follow your cursor. Choose
        Cursor or another tool to put it away. It is never saved.
      </Caption>
    </Stack>
  );
}
