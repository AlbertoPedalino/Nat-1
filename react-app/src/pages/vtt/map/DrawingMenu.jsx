import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Menu,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import {
  areaEffect, areaSizeFeet, feetToCells, resizedAreaPoints,
} from '../../../shared/vtt/map/areas.js';
import { isNote as isNoteDrawing, scaledPoints } from '../../../shared/vtt/map/drawing.js';
import { useMenuPlacement } from './menuPlacement.js';
import {
  battleMapCheckboxRowSx,
  battleMapCompactFieldSx,
  battleMapControlLabelSx,
  battleMapMenuPaperSx,
} from './battleMapSurface.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import AreaEffectSelect from './AreaEffectSelect.jsx';
import { gridCellWord } from '../../../shared/vtt/map/hexGeometry.js';
import ColorField from '../../../shared/ui/ColorField.jsx';
import { useDebouncedPatch } from '../../../shared/ui/useDebouncedPatch.js';

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
  const typed = useDebouncedPatch((patch) => onSave(drawing, patch));
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

  // At the press; on a touch screen left there while typing, lifted only to
  // keep the field above the keyboard.
  const placement = useMenuPlacement(anchor);

  useEffect(() => () => cancelAnimationFrame(previewFrameRef.current), []);

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
  const cellWord = gridCellWord(gridShape);

  // Typed text waits for a pause; a click saves at once, carrying what is
  // still waiting.
  const saveSoon = (patch) => typed.add(patch);
  const saveNow = (patch) => onSave(drawing, { ...typed.take(), ...patch });

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
    ? `${capitalize(area.shape)}${area.effect ? ` · ${areaEffect(area.effect)?.label}` : ''}`
    : isNote ? 'Note' : 'Drawing';
  const sizeLabel = {
    circle: 'Radius (ft)', square: 'Side (ft)', cone: 'Length (ft)', line: 'Length (ft)',
  }[area?.shape];

  return (
    <Menu
      open={Boolean(anchor)}
      onClose={() => {
        typed.cancel();
        onClose();
      }}
      {...placement.menuProps}
      slotProps={{
        transition: placement.transitionProps,
        paper: {
          sx: battleMapMenuPaperSx(MENU_WIDTH),
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
            label={<Typography sx={battleMapControlLabelSx}>Hidden from the players</Typography>}
            sx={battleMapCheckboxRowSx}
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
            sx={battleMapCompactFieldSx}
          />
        ) : null}

        <Box sx={colorRowSx}>
          <Typography sx={battleMapControlLabelSx}>Colour</Typography>
          {/* Nothing reaches the board until the hand rests: redrawing the
              scene for every step of the native palette is what made it
              stutter. */}
          <ColorField
            label="Colour"
            value={drawing.color || VTT_COLORS.gold}
            deferMs={COLOR_DELAY}
            onChange={(color) => onSave(drawing, { color })}
          />
        </Box>

        {area ? (
          <AreaEffectSelect
            value={area.effect}
            onChange={(effect) => {
              // An effect brings its colour, as it does in the Draw panel.
              const colour = effect ? areaEffect(effect)?.color : null;
              onSave(drawing, { area: { ...area, effect }, ...(colour ? { color: colour } : null) });
            }}
            sx={battleMapCompactFieldSx}
          />
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
            label={<Typography sx={battleMapControlLabelSx}>Filled</Typography>}
            sx={battleMapCheckboxRowSx}
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
              sx={{ ...battleMapCompactFieldSx, flex: 1 }}
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
                sx={{ ...battleMapCompactFieldSx, flex: 1 }}
              />
            ) : null}
          </Stack>
        ) : (
          <Box>
            <Typography sx={battleMapControlLabelSx}>{`Size ×${scale.toFixed(2).replace(/\.?0+$/, '')}`}</Typography>
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

const MENU_WIDTH = 280;
const COLOR_DELAY = 180;

const sectionTitleSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.md,
  fontWeight: 800,
  letterSpacing: LETTER_SPACINGS.md,
  color: 'primary.main',
};

const helperSx = { color: 'text.secondary', fontSize: FONT_SIZES.xxs, lineHeight: 1.25 };

const colorRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 0.6,
};

const menuButtonSx = { fontSize: FONT_SIZES.sm, py: 0.35 };

