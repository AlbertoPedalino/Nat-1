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
  Eye,
  EyeOff,
  Image as ImageIcon,
  MousePointer2,
  Pointer,
  SquareDashedMousePointer,
  Users,
} from 'lucide-react';
import { pillLabelSx } from './panelStyles.js';

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
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Pieces on the other layers stay visible but cannot be moved, so arranging
        the party never nudges the scenery. The GM layer is never sent to players.
      </Typography>
    </Stack>
  );
}

const compactLayerSx = {
  bgcolor: vttAlpha(VTT_COLORS.surface, 0.85),
  border: `1px solid ${vttAlpha(VTT_COLORS.accent, 0.35)}`,
  '& .MuiToggleButton-root': { color: VTT_COLORS.textSecondary, border: 0, px: 1 },
  '& .Mui-selected': { color: VTT_COLORS.surface, bgcolor: VTT_COLORS.accent },
};

export function FogPanel({ scene, busy, paintMode, brushSize, onEnableFog, onPaintModeChange, onBrushSizeChange, onFogAll }) {
  if (!scene.fog) {
    return (
      <Stack spacing={1}>
        <Button size="small" variant="outlined" startIcon={<Cloud size={15} />} disabled={busy} onClick={onEnableFog}>
          Cover the map
        </Button>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        While a brush is selected the left button paints and the middle one pans.
      </Typography>
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
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Once selected, the whole table sees the dot follow your cursor. Choose
        Cursor or another tool to put it away. It is never saved.
      </Typography>
    </Stack>
  );
}
