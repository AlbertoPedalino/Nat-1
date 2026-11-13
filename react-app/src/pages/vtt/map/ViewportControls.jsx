import { Button, Stack, Typography } from '@mui/material';
import {
  Maximize2, Minimize2, ScrollText, Settings2, Trash2, X,
} from 'lucide-react';
import { mapIconButtonSx, mapPanelButtonSx } from './battleMapSurface.js';
import {
  cornerButtonsSx,
  fullscreenBtnSx,
  fullscreenSheetButtonSx,
  selectionCountSx,
  selectionToolbarSx,
} from './sceneViewportStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';

// Buttons that sit on the map. Each is marked `data-viewport-control`, so the
// map does not take their clicks for the start of a pan.

// The box selection's count, with Delete and Clear.
export function SelectionToolbar({
  count, canDelete, onDelete, onClear,
}) {
  return (
    <Stack
      data-viewport-control
      direction="row"
      spacing={0.75}
      sx={selectionToolbarSx}
    >
      <Typography sx={selectionCountSx}>{count} selected</Typography>
      <Button
        size="small"
        color="error"
        startIcon={<Trash2 size={ICON_SIZES.sm} />}
        onClick={onDelete}
        disabled={!canDelete}
      >
        Delete
      </Button>
      <TipIconButton title="Clear selection" size="small" onClick={onClear} sx={mapPanelButtonSx}>
        <X size={ICON_SIZES.sm} />
      </TipIconButton>
    </Stack>
  );
}

// Top right, in one row: the rolls, the fullscreen Sheet, then the tools
// toggle in the corner. A row rather than set offsets, so a button that is
// missing (no sheet outside fullscreen) leaves no gap.
export function CornerButtons({
  rolls, showSheetButton, sheetOpen, onSheetOpenChange, hasControls, controlsOpen, onToggleControls,
}) {
  return (
    <Stack direction="row" spacing={0.75} data-viewport-control sx={cornerButtonsSx}>
      {rolls}
      {showSheetButton ? (
        <Button
          size="small"
          variant={sheetOpen ? 'contained' : 'outlined'}
          startIcon={<ScrollText size={ICON_SIZES.sm} />}
          aria-label={sheetOpen ? 'Hide floating character sheet' : 'Show floating character sheet'}
          onClick={() => onSheetOpenChange(!sheetOpen)}
          sx={fullscreenSheetButtonSx}
        >
          Sheet
        </Button>
      ) : null}
      {hasControls ? (
        <TipIconButton title={controlsOpen ? 'Hide the tools' : 'Show the tools'} size="small" aria-expanded={controlsOpen} onClick={onToggleControls} sx={mapIconButtonSx}>
          {controlsOpen ? <X size={ICON_SIZES.md} /> : <Settings2 size={ICON_SIZES.md} />}
        </TipIconButton>
      ) : null}
    </Stack>
  );
}

export function FullscreenButton({ active, onToggle }) {
  return (
    <TipIconButton title={active ? 'Leave fullscreen' : 'Fullscreen map'} size="small" data-viewport-control onClick={onToggle} sx={fullscreenBtnSx}>
      {active ? <Minimize2 size={ICON_SIZES.md} /> : <Maximize2 size={ICON_SIZES.md} />}
    </TipIconButton>
  );
}
