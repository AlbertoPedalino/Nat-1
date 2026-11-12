import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import {
  areaEffect, areaSizeFeet, feetToCells, resizedAreaPoints,
} from '../../../shared/vtt/map/areas.js';
import { isNote as isNoteDrawing, scaledPoints, strokeExtent } from '../../../shared/vtt/map/drawing.js';
import { battleMapCompactFieldSx, mapPanelTitleSx } from './battleMapSurface.js';
import MapMenu, { HiddenFromPlayersToggle, MenuFooterActions } from './MapMenu.jsx';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import AreaEffectSelect from './AreaEffectSelect.jsx';
import { gridCellWord } from '../../../shared/vtt/map/hexGeometry.js';
import ColorField from '../../../shared/ui/ColorField.jsx';
import { useDebouncedPatch } from '../../../shared/ui/useDebouncedPatch.js';
import ToggleRow from '../../../shared/ui/ToggleRow.jsx';
import LabeledSlider from '../../../shared/ui/LabeledSlider.jsx';
import { CONTROL_LABEL_SX } from '../../../shared/ui/controlLabel.js';

// Right-click (or a long press) on a mark: the same idea as a piece's menu.
// Its label, who sees it, its colour, its size, its thickness, and taking it
// away. Every
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
  // Both are what the mark is now, not a factor from this opening: reopened,
  // the sliders stand where they were left and stay within the same bounds.
  const [size, setSize] = useState(0);
  const [thickness, setThickness] = useState(3);
  // The mark as it was when the menu opened: a stroke is scaled from it rather
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
    setSize(isNoteDrawing(drawing) ? drawing.width || 3 : strokeExtent(drawing.points));
    setThickness(drawing.width || 3);
  }, [drawing, feetPerCell]);

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
  const opened = openedRef.current || drawing;
  const openedExtent = strokeExtent(opened.points);
  const sizePatchOf = (value) => (isNote
    ? { width: value }
    : { points: scaledPoints(opened.points, value / openedExtent) });
  // A note's lettering is shown against the default size; a stroke in feet.
  const sizeText = isNote
    ? `×${trimNumber(size / NOTE_WIDTH)}`
    : `${Math.round(size * feetPerCell)} ft`;
  const sizeRange = isNote
    ? { min: Math.min(opened.width || NOTE_WIDTH, NOTE_WIDTH * 0.25), max: Math.max(opened.width || NOTE_WIDTH, NOTE_WIDTH * MAX_NOTE_SCALE), step: NOTE_WIDTH * 0.05 }
    : { min: Math.min(openedExtent, 0.5), max: Math.max(openedExtent, MAX_STROKE_CELLS), step: 0.25 };
  // A dot has no size but its thickness; a note's width is its lettering.
  const canSize = isNote || (!area && openedExtent > 0);
  const canThicken = !isNote;

  const kind = area
    ? `${capitalize(area.shape)}${area.effect ? ` · ${areaEffect(area.effect)?.label}` : ''}`
    : isNote ? 'Note' : 'Drawing';
  const sizeLabel = {
    circle: 'Radius (ft)', square: 'Side (ft)', cone: 'Length (ft)', line: 'Length (ft)',
  }[area?.shape];

  // At the press; on a touch screen left there while typing, lifted only to
  // keep the field above the keyboard (MapMenu's placement).
  return (
    <MapMenu
      point={anchor}
      onClose={() => {
        typed.cancel();
        onClose();
      }}
      width={MENU_WIDTH}
    >
      <Typography sx={mapPanelTitleSx}>{kind}</Typography>

      {onVisibility ? (
        <HiddenFromPlayersToggle
          checked={Boolean(drawing.hiddenFromPlayers)}
          onChange={(hidden) => onVisibility(drawing, hidden)}
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
        <Typography sx={CONTROL_LABEL_SX}>Colour</Typography>
        {/* Nothing reaches the board until the hand rests: redrawing the
            scene for every step of the native palette is what made it
            stutter. */}
        <ColorField
          label="Colour"
          value={drawing.color || VTT_COLORS.accent}
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
        <ToggleRow
          dense
          control="checkbox"
          label="Filled"
          checked={Boolean(area.filled)}
          onChange={(filled) => onSave(drawing, { area: { ...area, filled } })}
        />
      ) : null}

      {area ? (
        <Stack direction="row" spacing={0.5}>
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
      ) : null}

      {canSize ? (
        <LabeledSlider
          label="Size"
          valueText={sizeText}
          value={size}
          {...sizeRange}
          onChange={(value) => {
            setSize(value);
            preview(sizePatchOf(value));
          }}
          onCommit={(value) => onSave(drawing, sizePatchOf(value))}
        />
      ) : null}

      {canThicken ? (
        <LabeledSlider
          label="Thickness"
          valueText={trimNumber(thickness)}
          value={thickness}
          min={0.5}
          max={Math.max(opened.width || 3, MAX_THICKNESS)}
          step={0.5}
          onChange={(value) => {
            setThickness(value);
            preview({ width: value });
          }}
          onCommit={(value) => onSave(drawing, { width: value })}
        />
      ) : null}

      {area ? (
        <Typography sx={helperSx}>{`${feetPerCell} ft per ${cellWord}, as set on the ruler.`}</Typography>
      ) : null}

      <MenuFooterActions
        onClose={onClose}
        actions={[{ label: 'Delete', icon: Trash2, color: 'error', onClick: () => onDelete(drawing) }]}
      />
    </MapMenu>
  );
}

function trimNumber(value) {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

const MENU_WIDTH = 280;
// A note's default lettering, shown as ×1.
const NOTE_WIDTH = 3;
// The slider tops, high enough to be out of the way at a table: a stroke
// reaches 300 cells, a note ×30, a line 100 (each further when the mark already
// is, so a big mark opens where it stands).
const MAX_STROKE_CELLS = 300;
const MAX_NOTE_SCALE = 30;
const MAX_THICKNESS = 100;
const COLOR_DELAY = 180;

const helperSx = { color: 'text.secondary', fontSize: FONT_SIZES.xxs, lineHeight: LINE_HEIGHTS.snug };

const colorRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 0.5,
};

