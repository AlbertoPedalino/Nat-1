import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Menu,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import {
  AREA_EFFECTS, areaEffect, areaSizeFeet, feetToCells, resizedAreaPoints,
} from '../../../shared/vtt/map/areas.js';
import { isNote as isNoteDrawing, scaledPoints } from '../../../shared/vtt/map/drawing.js';
import { fullscreenContainer } from './fullscreenContainer.js';
import { battleMapDialogPaperSx } from './battleMapSurface.js';

// Right-click (or a long press) on a mark: the same idea as a piece's menu.
// Its label, who sees it, its colour, its size, and taking it away. Every
// control writes as it is used; typing waits until the hand stops.
//
// `onPreview` shows a change on this screen only (a slider being dragged),
// `onSave` writes it. `onVisibility` is the GM's alone.
export default function DrawingMenu({
  drawing, anchor, feetPerCell = 5, gridShape = 'square',
  onClose, onPreview, onSave, onVisibility, onDelete,
}) {
  const [text, setText] = useState('');
  const [sizeFeet, setSizeFeet] = useState('');
  const [breadthFeet, setBreadthFeet] = useState('');
  const [scale, setScale] = useState(1);
  // The mark as it was when the menu opened: the slider scales from it rather
  // than compounding on every step, and a refused write goes back to it.
  const openedRef = useRef(null);
  const typingTimerRef = useRef(null);
  const colorTimerRef = useRef(null);
  // A slider or a number moves many times a frame; the board is redrawn once a
  // frame with the latest of them, or dragging stutters.
  const previewRef = useRef(null);
  const previewFrameRef = useRef(0);

  // Loaded once per opening, keyed by id: a realtime echo of this menu's own
  // writes must not reset a half-typed label.
  useEffect(() => {
    if (!drawing) {
      openedRef.current = null;
      return;
    }
    if (openedRef.current?.id === drawing.id) return;
    openedRef.current = drawing;
    setText(drawing.text || '');
    setSizeFeet(drawing.area ? String(areaSizeFeet(drawing, feetPerCell)) : '');
    setBreadthFeet(drawing.area?.shape === 'line'
      ? String(Math.round((drawing.area.breadth || 1) * feetPerCell * 100) / 100)
      : '');
    setScale(1);
  }, [drawing, feetPerCell]);

  useEffect(() => () => {
    clearTimeout(typingTimerRef.current);
    clearTimeout(colorTimerRef.current);
    cancelAnimationFrame(previewFrameRef.current);
  }, []);

  if (!drawing) return null;
  const area = drawing.area;
  const isNote = isNoteDrawing(drawing);
  // A dot has nowhere to put a label, and words on it would turn it into a note.
  const canLabel = Boolean(area) || isNote || (drawing.points?.length || 0) > 1;

  const preview = (patch) => {
    previewRef.current = { ...previewRef.current, ...patch };
    if (previewFrameRef.current) return;
    previewFrameRef.current = requestAnimationFrame(() => {
      previewFrameRef.current = 0;
      const pending = previewRef.current;
      previewRef.current = null;
      if (pending) onPreview(drawing, pending);
    });
  };
  const cellWord = gridShape === 'hex' ? 'hex' : 'square';

  const saveSoon = (patch) => {
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onSave(drawing, patch), TYPING_DELAY);
  };
  const saveNow = (patch) => {
    clearTimeout(typingTimerRef.current);
    onSave(drawing, patch);
  };

  const textPatch = (value) => {
    // A note is its words: emptied, it would become an invisible stroke.
    if (isNote && !value.trim()) return null;
    return { text: value };
  };

  const sizePatch = (feet, breadth) => {
    const size = Number(feet);
    if (!(size > 0)) return null;
    const patch = { points: resizedAreaPoints(drawing, size, feetPerCell) };
    if (area.shape === 'line' && Number(breadth) > 0) {
      patch.area = { ...area, breadth: feetToCells(Number(breadth), feetPerCell) };
    }
    return patch;
  };

  // Strokes grow about their middle; a note's size is its lettering.
  const scalePatch = (factor) => (isNote
    ? { width: Math.max(0.5, (openedRef.current?.width || 3) * factor) }
    : { points: scaledPoints(openedRef.current?.points || drawing.points, factor) });

  const kind = area
    ? `${area.shape[0].toUpperCase()}${area.shape.slice(1)}${area.effect ? ` · ${areaEffect(area.effect)?.label}` : ''}`
    : isNote ? 'Note' : 'Drawing';
  const sizeLabel = {
    circle: 'Radius (ft)', square: 'Side (ft)', cone: 'Length (ft)', line: 'Length (ft)',
  }[area?.shape];

  return (
    <Menu
      open={Boolean(anchor)}
      onClose={() => {
        clearTimeout(typingTimerRef.current);
        onClose();
      }}
      anchorReference="anchorPosition"
      anchorPosition={anchor ? { top: anchor.y, left: anchor.x } : undefined}
      container={fullscreenContainer}
      slotProps={{
        paper: {
          sx: {
            ...battleMapDialogPaperSx,
            width: 280,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: 'calc(100% - 32px)',
            '& .MuiMenu-list': { p: 0 },
          },
        },
      }}
    >
      <Stack spacing={0.75} sx={{ px: 1, py: 0.75 }}>
        <Typography sx={sectionTitleSx}>{kind}</Typography>

        {onVisibility ? (
          <FormControlLabel
            control={(
              <Checkbox
                size="small"
                checked={Boolean(drawing.hiddenFromPlayers)}
                onChange={(event) => onVisibility(drawing, event.target.checked)}
              />
            )}
            label={<Typography sx={controlLabelSx}>Hidden from the players</Typography>}
            sx={formControlSx}
          />
        ) : null}

        {canLabel ? (
          <TextField
            label={isNote ? 'Text' : 'Label'}
            size="small"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              const patch = textPatch(event.target.value);
              if (patch) saveSoon(patch);
            }}
            onBlur={() => {
              const patch = textPatch(text);
              if (patch && (drawing.text || '') !== text) saveNow(patch);
            }}
            onKeyDown={(event) => {
              // The menu swallows keys otherwise; Enter closes, the text is saved.
              event.stopPropagation();
              if (event.key === 'Enter') {
                const patch = textPatch(text);
                if (patch) saveNow(patch);
                onClose();
              }
            }}
            slotProps={{ htmlInput: { maxLength: 120 } }}
            sx={compactFieldSx}
          />
        ) : null}

        <Box sx={colorRowSx}>
          <Typography sx={controlLabelSx}>Colour</Typography>
          {/* Uncontrolled, and nothing reaches the board until the hand
              rests: redrawing the scene for every step of the native palette
              is what made it stutter. Remounted when an effect sets the
              colour, so the swatch shows it. */}
          <Box
            key={`${drawing.id}-color-${area?.effect || ''}`}
            component="input"
            type="color"
            aria-label="Colour"
            defaultValue={drawing.color || VTT_COLORS.gold}
            onInput={(event) => {
              const color = event.currentTarget.value;
              clearTimeout(colorTimerRef.current);
              colorTimerRef.current = setTimeout(() => onSave(drawing, { color }), COLOR_DELAY);
            }}
            sx={colorInputSx}
          />
        </Box>

        {area ? (
          <TextField
            select
            label="Effect"
            size="small"
            value={area.effect || 'none'}
            onChange={(event) => {
              const effect = event.target.value === 'none' ? null : event.target.value;
              // An effect brings its colour, as it does in the Draw panel.
              const colour = effect ? areaEffect(effect)?.color : null;
              onSave(drawing, { area: { ...area, effect }, ...(colour ? { color: colour } : null) });
            }}
            // Its list must open inside the map, or fullscreen never paints it.
            slotProps={{ select: { MenuProps: { container: fullscreenContainer } } }}
            sx={compactFieldSx}
          >
            <MenuItem value="none">None</MenuItem>
            {AREA_EFFECTS.map((effect) => (
              <MenuItem key={effect.key} value={effect.key}>
                <Box component="span" sx={{ ...effectDotSx, bgcolor: effect.color }} />
                {effect.label}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        {area && !area.effect ? (
          <FormControlLabel
            control={(
              <Checkbox
                size="small"
                checked={Boolean(area.filled)}
                onChange={(event) => onSave(drawing, { area: { ...area, filled: event.target.checked } })}
              />
            )}
            label={<Typography sx={controlLabelSx}>Filled</Typography>}
            sx={formControlSx}
          />
        ) : null}

        {area ? (
          <Stack direction="row" spacing={0.6}>
            <TextField
              label={sizeLabel}
              size="small"
              type="number"
              value={sizeFeet}
              onChange={(event) => {
                setSizeFeet(event.target.value);
                const patch = sizePatch(event.target.value, breadthFeet);
                if (patch) {
                  preview(patch);
                  saveSoon(patch);
                }
              }}
              onKeyDown={(event) => event.stopPropagation()}
              slotProps={{ htmlInput: { min: feetPerCell, step: feetPerCell } }}
              sx={{ ...compactFieldSx, flex: 1 }}
            />
            {area.shape === 'line' ? (
              <TextField
                label="Width (ft)"
                size="small"
                type="number"
                value={breadthFeet}
                onChange={(event) => {
                  setBreadthFeet(event.target.value);
                  const patch = sizePatch(sizeFeet, event.target.value);
                  if (patch) {
                    preview(patch);
                    saveSoon(patch);
                  }
                }}
                onKeyDown={(event) => event.stopPropagation()}
                slotProps={{ htmlInput: { min: feetPerCell, step: feetPerCell } }}
                sx={{ ...compactFieldSx, flex: 1 }}
              />
            ) : null}
          </Stack>
        ) : (
          <Box>
            <Typography sx={controlLabelSx}>{`Size ×${scale.toFixed(2).replace(/\.?0+$/, '')}`}</Typography>
            <Slider
              size="small"
              aria-label="Size"
              min={0.25}
              max={4}
              step={0.05}
              value={scale}
              onChange={(_, value) => {
                setScale(value);
                preview(scalePatch(value));
              }}
              onChangeCommitted={(_, value) => onSave(drawing, scalePatch(value))}
            />
          </Box>
        )}

        {area ? (
          <Typography sx={helperSx}>{`${feetPerCell} ft per ${cellWord}, as set on the ruler.`}</Typography>
        ) : null}

        <Divider />

        <Stack direction="row" spacing={0.6}>
          <Button size="small" variant="outlined" onClick={onClose} sx={{ ...menuButtonSx, flex: 1 }}>Done</Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={14} />}
            onClick={() => { onDelete(drawing); onClose(); }}
            sx={menuButtonSx}
          >
            Delete
          </Button>
        </Stack>
      </Stack>
    </Menu>
  );
}

const TYPING_DELAY = 400;
const COLOR_DELAY = 180;

const sectionTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.72rem',
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const compactFieldSx = {
  '& .MuiInputBase-root': { height: 34, fontSize: '0.72rem' },
  '& .MuiInputLabel-root': { fontSize: '0.68rem' },
  '& .MuiInputLabel-shrink': { transform: 'translate(14px, -7px) scale(0.75)' },
};

const formControlSx = {
  m: 0,
  minHeight: 24,
  '& .MuiCheckbox-root': { p: 0.35, mr: 0.25 },
  '& .MuiSvgIcon-root': { fontSize: 17 },
};

const controlLabelSx = { fontSize: '0.68rem', lineHeight: 1.2 };
const helperSx = { color: 'text.secondary', fontSize: '0.57rem', lineHeight: 1.25 };

const colorRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 0.6,
};

const colorInputSx = {
  width: 32,
  height: 32,
  p: '2px',
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorderStrong',
  borderRadius: 1,
  bgcolor: 'gmboard.vtt.inset',
  cursor: 'pointer',
};

const menuButtonSx = { fontSize: '0.68rem', py: 0.35 };

const effectDotSx = {
  display: 'inline-block',
  width: 10,
  height: 10,
  mr: 1,
  borderRadius: '50%',
  flexShrink: 0,
};
