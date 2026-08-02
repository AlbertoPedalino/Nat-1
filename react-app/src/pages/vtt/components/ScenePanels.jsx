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
import {
  Cloud,
  Eraser,
  Eye,
  EyeOff,
  Grid3x3,
  Image as ImageIcon,
  ImagePlus,
  MousePointer2,
  Pencil,
  Circle,
  Pointer,
  Ruler,
  Square,
  Triangle,
  Type,
  Undo2,
  Users,
} from 'lucide-react';

// The scene's settings, split by the question they answer. Each one is a panel
// behind its own icon on the rail rather than a strip across the top: the map is
// the page, and controls laid over it have to be summoned, not endured.

export function MapPanel({
  scene, busy, onUploadMap, onUploadBackground, onShownImageChange, onAddImage,
  onGridChange, onPlayAreaChange, onFitPlayArea,
  // The switch has its own place on the map when this panel sits under it.
  hideSwitch = false,
}) {
  const mapRef = useRef(null);
  const backgroundRef = useRef(null);
  const extraRef = useRef(null);
  const setGrid = (patch) => onGridChange({ ...scene.grid, ...patch });

  return (
    <Stack spacing={1.25}>
      {hideSwitch ? null : <ShownImageSwitch scene={scene} onShownImageChange={onShownImageChange} />}

      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" fullWidth disabled={busy} onClick={() => mapRef.current?.click()}>
          {scene.imagePath ? 'Replace map' : 'Upload map'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          fullWidth
          disabled={busy}
          onClick={() => backgroundRef.current?.click()}
        >
          {scene.backgroundPath ? 'Replace bg' : 'Upload bg'}
        </Button>
      </Stack>

      {/* Anything else that belongs on the map — a rug, a door, a handout — is a
          piece on the map layer, so it can be moved, resized and removed like
          everything else instead of being a third special slot. */}
      <Button
        size="small"
        variant="outlined"
        startIcon={<ImagePlus size={15} />}
        disabled={busy}
        onClick={() => extraRef.current?.click()}
      >
        Add an image to the map
      </Button>

      <HiddenFileInput inputRef={mapRef} onPick={onUploadMap} />
      <HiddenFileInput inputRef={backgroundRef} onPick={onUploadBackground} />
      <HiddenFileInput inputRef={extraRef} onPick={onAddImage} />

      {/* Grid calibration is the fiddly part of any battlemap: the cell size
          almost never matches the image, so all three numbers are editable. */}
      <Typography variant="caption" color="text.secondary">Grid</Typography>
      <Stack direction="row" spacing={0.75}>
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
      </Stack>
      <FormControlLabel
        control={(
          <Switch
            size="small"
            checked={scene.grid.visible}
            onChange={(event) => setGrid({ visible: event.target.checked })}
          />
        )}
        label={<Typography variant="body2">Show the grid</Typography>}
      />

      {/* Anything outside this rectangle is staging: the players never receive
          it, so an ambush can be arranged off the edge in plain sight. */}
      <Typography variant="caption" color="text.secondary">Play area</Typography>
      {scene.playArea ? (
        <>
          <Stack direction="row" spacing={0.75}>
            {['x', 'y', 'w', 'h'].map((key) => (
              <TextField
                key={key}
                label={key.toUpperCase()}
                size="small"
                type="number"
                value={scene.playArea[key]}
                onChange={(event) => onPlayAreaChange({ ...scene.playArea, [key]: Number(event.target.value) })}
                sx={numberSx}
              />
            ))}
          </Stack>
          <Button size="small" disabled={busy} onClick={() => onPlayAreaChange(null)}>
            Use the whole scene
          </Button>
        </>
      ) : (
        <>
          <Button
            size="small"
            variant="outlined"
            // Sized from the picture on screen, so it has to be the battlemap:
            // fitted while the background is up it would take that one's shape.
            disabled={busy || scene.shownImage !== 'map'}
            onClick={onFitPlayArea}
          >
            Limit to the map
          </Button>
          {scene.shownImage !== 'map' ? (
            <Typography variant="caption" color="text.secondary">
              Switch to the battlemap to set the play area — it is measured from
              the picture on screen.
            </Typography>
          ) : null}
        </>
      )}
    </Stack>
  );
}

// Two slots rather than one picture you keep replacing: the battlemap is the
// thing with a grid on it, the background is the establishing shot, and a
// session flips between them repeatedly. Small enough to live on the map itself,
// which is where the switching actually happens.
export function ShownImageSwitch({ scene, compact = false, onShownImageChange }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      fullWidth={!compact}
      value={scene.shownImage}
      onChange={(_, value) => value && onShownImageChange(value)}
      aria-label="Shown image"
      sx={compact ? compactSwitchSx : null}
    >
      <ToggleButton value="map" aria-label="Show the battlemap">
        <Grid3x3 size={14} />
        <Box component="span" sx={pillLabelSx}>Battlemap</Box>
      </ToggleButton>
      <ToggleButton value="background" aria-label="Show the background">
        <ImageIcon size={14} />
        <Box component="span" sx={pillLabelSx}>Background</Box>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

const compactSwitchSx = {
  bgcolor: 'rgba(15,14,13,0.85)',
  border: '1px solid rgba(232,201,106,0.35)',
  '& .MuiToggleButton-root': { color: '#b8a87a', border: 0, px: 1, py: 0.4 },
  '& .Mui-selected': { color: '#0f0e0d', bgcolor: '#e8c96a' },
};

function HiddenFileInput({ inputRef, onPick }) {
  return (
    <Box
      component="input"
      ref={inputRef}
      type="file"
      accept="image/*"
      sx={{ display: 'none' }}
      onChange={(event) => {
        const file = event.target.files?.[0];
        // Cleared before the handler runs, so picking the same file twice in a
        // row still fires a change event.
        event.target.value = '';
        if (file) onPick(file);
      }}
    />
  );
}

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
  bgcolor: 'rgba(15,14,13,0.85)',
  border: '1px solid rgba(232,201,106,0.35)',
  '& .MuiToggleButton-root': { color: '#b8a87a', border: 0, px: 1 },
  '& .Mui-selected': { color: '#0f0e0d', bgcolor: '#e8c96a' },
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
  busy, paintMode, drawColor, drawWidth, canUndo,
  onPaintModeChange, onDrawColorChange, onDrawWidthChange, onUndoDrawing,
}) {
  const DRAW_MODES = ['draw', 'erase', 'text'];

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
        <Tooltip title="Erase your strokes">
          <ToggleButton value="erase" aria-label="Erase"><Eraser size={14} /></ToggleButton>
        </Tooltip>
        <Tooltip title="Write on the map">
          <ToggleButton value="text" aria-label="Write"><Type size={14} /></ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box
          component="input"
          type="color"
          value={drawColor}
          onChange={(event) => onDrawColorChange(event.target.value)}
          aria-label="Ink colour"
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

// The 5e templates, the way Roll20 offers them: pick a shape, then drag from
// the origin. The number is the same for all of them — how far it reaches —
// which is why the panel is a shape picker and not four separate tools.
export function MeasurePanel({ paintMode, measureShape, feetPerCell, onPaintModeChange, onShapeChange, onFeetPerCellChange }) {
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

      <TextField
        label="Feet per square"
        size="small"
        type="number"
        value={feetPerCell}
        onChange={(event) => onFeetPerCellChange(Number(event.target.value))}
      />

      <Typography variant="caption" color="text.secondary">
        Drag from the origin. A 5e cone is as wide at the far end as it is long,
        and a diagonal counts as one square — three across and two down is 15 ft.
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
        Hold the left button and the whole table sees the dot follow your cursor.
        It is never saved, and it fades on its own if you disconnect.
      </Typography>
    </Stack>
  );
}

const numberSx = { width: 92 };

const pillLabelSx = {
  ml: 0.5,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.6rem',
  letterSpacing: '0.04em',
};

const colorInputSx = {
  width: 34,
  height: 34,
  p: 0,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'transparent',
  cursor: 'pointer',
  flexShrink: 0,
};
