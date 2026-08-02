import { useRef } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { Cloud, Eye, EyeOff, Grid3x3, Image, MousePointer2, Trash2 } from 'lucide-react';

// Grid calibration is the fiddly part of any battlemap: the cell size almost
// never matches the image exactly, so size and both offsets are editable and
// apply live.
export default function SceneToolbar({
  scene,
  busy,
  selectedToken,
  paintMode,
  brushSize,
  onUploadMap,
  onGridChange,
  onDeleteToken,
  onEnableFog,
  onPaintModeChange,
  onBrushSizeChange,
  onFogAll,
}) {
  const fileRef = useRef(null);

  const setGrid = (patch) => onGridChange({ ...scene.grid, ...patch });

  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={barSx}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Image size={15} />}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {scene.imagePath ? 'Replace map' : 'Upload map'}
        </Button>
        <Box
          component="input"
          ref={fileRef}
          type="file"
          accept="image/*"
          sx={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onUploadMap(file);
          }}
        />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
        <Grid3x3 size={15} />
        <TextField
          label="Cell"
          size="small"
          type="number"
          value={scene.grid.size}
          onChange={(event) => setGrid({ size: Number(event.target.value) })}
          sx={numberSx}
        />
        <TextField
          label="Offset X"
          size="small"
          type="number"
          value={scene.grid.offsetX}
          onChange={(event) => setGrid({ offsetX: Number(event.target.value) })}
          sx={numberSx}
        />
        <TextField
          label="Offset Y"
          size="small"
          type="number"
          value={scene.grid.offsetY}
          onChange={(event) => setGrid({ offsetY: Number(event.target.value) })}
          sx={numberSx}
        />
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={scene.grid.visible}
              onChange={(event) => setGrid({ visible: event.target.checked })}
            />
          )}
          label={<Typography variant="body2">Grid</Typography>}
        />
      </Stack>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
        {!scene.fog ? (
          <Button size="small" variant="outlined" startIcon={<Cloud size={15} />} disabled={busy} onClick={onEnableFog}>
            Enable fog
          </Button>
        ) : (
          <>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={paintMode}
              onChange={(_, value) => onPaintModeChange(value || 'select')}
              aria-label="Fog tool"
            >
              <ToggleButton value="select" aria-label="Move tokens">
                <MousePointer2 size={14} />
              </ToggleButton>
              <ToggleButton value="reveal" aria-label="Reveal fog">
                <Eye size={14} />
              </ToggleButton>
              <ToggleButton value="hide" aria-label="Cover with fog">
                <EyeOff size={14} />
              </ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label="Brush"
              size="small"
              type="number"
              value={brushSize}
              onChange={(event) => onBrushSizeChange(Number(event.target.value))}
              sx={{ width: 80 }}
            />
            <Tooltip title="Reveal the whole map">
              <span>
                <Button size="small" onClick={() => onFogAll(true)} disabled={busy}>All</Button>
              </span>
            </Tooltip>
            <Tooltip title="Cover the whole map again">
              <span>
                <Button size="small" onClick={() => onFogAll(false)} disabled={busy}>None</Button>
              </span>
            </Tooltip>
          </>
        )}
      </Stack>

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Tooltip title={selectedToken ? 'Remove the selected token' : 'Select a token first'}>
          <span>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={15} />}
              disabled={!selectedToken || busy}
              onClick={() => onDeleteToken(selectedToken)}
            >
              Remove
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

const barSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper',
  alignItems: { xs: 'stretch', lg: 'center' },
};

const numberSx = { width: 96 };
