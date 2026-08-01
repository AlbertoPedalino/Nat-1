import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Card, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import { Eye, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { confirmDiscard } from '../../gmboard/logic/confirmDiscard.js';
import {
  DEFAULT_NOTE_SIZE,
  MAX_NOTE_COLS,
  MIN_NOTE_HEIGHT,
  hasNoteContent,
  normalizeNoteSize,
} from '../logic/notes.js';
import { columnUnitWidth, columnsForWidth, rowSpanForHeight } from '../logic/layout.js';
import { DRAG_TRANSFORM, DRAG_TRANSITION } from '../logic/dragMotion.js';
import NoteMarkdown from './NoteMarkdown.jsx';
import HighlightedText from './HighlightedText.jsx';

const KEYBOARD_HEIGHT_STEP = 40;
// Shared empty array: a fresh one per render would restart the markdown
// pipeline on every keystroke.
const NO_TOKENS = [];

export default function NoteCard({
  note,
  index,
  count,
  focusTitle = false,
  onFocusHandled,
  onUpdate,
  onMove,
  onRemove,
  onResize,
  onRegister,
  dragHandleProps,
  dragging = false,
  // A filtered board hides notes, so a position on screen is no longer the
  // position in the list — reordering is withheld rather than silently wrong.
  reorderable = true,
  tokens = NO_TOKENS,
  confirmFn,
}) {
  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const cardRef = useRef(null);
  const resizeRef = useRef(null);
  const startRef = useRef(null);
  const mountedRef = useRef(false);
  // A note that opens empty opens *in* the editor, not merely showing it: the
  // first keystroke fills the body, and a card that only inferred the editor
  // from an empty body would flip to preview mid-word.
  const [editing, setEditing] = useState(!note.body);
  // A title is an input, and an input cannot hold a <mark>. While a search is
  // running the title is shown as text so the hit is visible, and clicking it
  // hands back the field — the same trade the body already makes.
  const [editingTitle, setEditingTitle] = useState(false);
  const showTitleField = editingTitle || tokens.length === 0;
  const [autoHeight, setAutoHeight] = useState(0);
  // An empty note still has nothing to preview, so blurring one leaves the
  // editor up rather than showing an empty box.
  const showEditor = editing || !note.body;
  const size = normalizeNoteSize(note.size);
  // Auto-height cards still have to claim the right number of grid rows, so the
  // rendered height is measured and translated into a row span.
  const rowSpan = rowSpanForHeight(size.height || autoHeight);

  useEffect(() => {
    if (size.height) return undefined;
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setAutoHeight(Math.ceil(entry.target.getBoundingClientRect().height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [size.height]);

  const setCardRef = useCallback((element) => {
    cardRef.current = element;
    onRegister?.(note.id, element);
  }, [note.id, onRegister]);

  useEffect(() => {
    if (!focusTitle) return;
    titleRef.current?.focus();
    onFocusHandled?.();
  }, [focusTitle, onFocusHandled]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  // Only a switch *into* editing moves the caret. On mount an empty note is
  // already editing, and stealing focus there would fight the title focus a
  // freshly added note asks for.
  useEffect(() => {
    if (mountedRef.current && editing) bodyRef.current?.focus();
    mountedRef.current = true;
  }, [editing]);

  const handleRemove = () => {
    if (hasNoteContent(note) && !confirmDiscard('Delete this note?', confirmFn)) return;
    onRemove(note.id);
  };

  const handleHandleKeyDown = (event) => {
    const offset = (event.key === 'ArrowUp' || event.key === 'ArrowLeft') ? -1
      : (event.key === 'ArrowDown' || event.key === 'ArrowRight') ? 1
        : 0;
    if (!offset) return;
    event.preventDefault();
    onMove(note.id, offset);
  };

  // An auto-height note has no stored pixel height, so resizing starts from
  // whatever the card currently measures on screen.
  const currentHeight = () => size.height || Math.round(cardRef.current?.getBoundingClientRect().height || MIN_NOTE_HEIGHT);

  const handleResizeKeyDown = (event) => {
    const colStep = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const heightStep = event.key === 'ArrowDown' ? KEYBOARD_HEIGHT_STEP
      : event.key === 'ArrowUp' ? -KEYBOARD_HEIGHT_STEP
        : 0;
    if (!colStep && !heightStep) return;
    event.preventDefault();
    onResize(note.id, {
      cols: size.cols + colStep,
      height: heightStep ? currentHeight() + heightStep : size.height,
    });
  };

  const handleResizePointerDown = (event) => {
    if (event.button !== 0) return;
    // preventDefault keeps the drag from selecting text, but it also suppresses
    // the focus a click would normally give the grip — so focus it by hand.
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current?.focus?.();
    resizeRef.current?.setPointerCapture?.(event.pointerId);
    const rect = cardRef.current?.getBoundingClientRect();
    const boardWidth = cardRef.current?.parentElement?.getBoundingClientRect().width;
    if (!rect) return;
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      height: rect.height,
      unitWidth: columnUnitWidth(boardWidth),
    };
  };

  const handleResizePointerMove = (event) => {
    const start = startRef.current;
    if (!start) return;
    onResize(note.id, {
      cols: Math.min(
        MAX_NOTE_COLS,
        columnsForWidth(start.width + (event.clientX - start.x), start.unitWidth),
      ),
      height: start.height + (event.clientY - start.y),
    });
  };

  const endResize = () => { startRef.current = null; };

  return (
    <Card
      ref={setCardRef}
      component="article"
      variant="outlined"
      sx={cardSx(size, rowSpan, dragging)}
    >
      <Box sx={toolbarSx}>
        {/* Arrow keys reorder too, but that stays a keyboard affordance rather
            than tooltip text. */}
        {reorderable ? (
          <Tooltip title="Drag to reorder">
            <IconButton
              size="small"
              aria-label={`Reorder note ${index + 1} of ${count}`}
              onKeyDown={handleHandleKeyDown}
              sx={handleSx}
              {...dragHandleProps}
            >
              <GripVertical size={16} />
            </IconButton>
          </Tooltip>
        ) : null}
        <Box sx={{ flex: 1 }} />
        {note.body ? (
          <Tooltip title={showEditor ? 'Preview markdown' : 'Edit note'}>
            <IconButton
              size="small"
              onClick={() => setEditing((previous) => !previous)}
              aria-label={showEditor ? 'Preview note' : 'Edit note'}
            >
              {showEditor ? <Eye size={16} /> : <Pencil size={16} />}
            </IconButton>
          </Tooltip>
        ) : null}
        <Tooltip title="Delete note">
          <IconButton
            size="small"
            color="error"
            onClick={handleRemove}
            aria-label="Delete note"
          >
            <Trash2 size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      {showTitleField ? (
        <TextField
          inputRef={titleRef}
          value={note.title}
          onChange={(event) => onUpdate(note.id, 'title', event.target.value)}
          onBlur={() => setEditingTitle(false)}
          label="Title (optional)"
          size="small"
          fullWidth
          slotProps={{ htmlInput: { maxLength: 120 } }}
          sx={titleSx}
        />
      ) : (
        <Box onClick={() => setEditingTitle(true)} sx={titlePreviewSx}>
          <Typography variant="caption" sx={previewLabelSx}>Title (optional)</Typography>
          <Typography sx={titleTextSx}>
            <HighlightedText text={note.title} tokens={tokens} />
          </Typography>
        </Box>
      )}
      {showEditor ? (
        <TextField
          inputRef={bodyRef}
          value={note.body}
          onChange={(event) => onUpdate(note.id, 'body', event.target.value)}
          onBlur={() => setEditing(false)}
          label="Note (markdown)"
          placeholder="**Bold**, - lists, | tables |…"
          multiline
          minRows={5}
          maxRows={size.height ? undefined : 18}
          fullWidth
          sx={bodySx}
        />
      ) : (
        // Clicking the rendered note goes back to editing; the toolbar pencil
        // covers the same switch for keyboard and screen-reader users.
        <Box onClick={() => setEditing(true)} sx={previewSx}>
          <Typography variant="caption" sx={previewLabelSx}>Note (markdown)</Typography>
          <NoteMarkdown tokens={tokens}>{note.body}</NoteMarkdown>
        </Box>
      )}

      <Tooltip title="Drag to resize">
        <Box
          ref={resizeRef}
          role="button"
          tabIndex={0}
          aria-label="Resize note"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onLostPointerCapture={endResize}
          onKeyDown={handleResizeKeyDown}
          onDoubleClick={() => onResize(note.id, { ...DEFAULT_NOTE_SIZE })}
          sx={resizeGripSx}
        />
      </Tooltip>
    </Card>
  );
}

const cardSx = (size, rowSpan, dragging) => ({
  position: 'relative',
  minWidth: 0,
  overflow: 'hidden',
  bgcolor: 'background.paper',
  borderColor: dragging ? 'primary.main' : 'divider',
  opacity: dragging ? 0.85 : 1,
  p: 1.5,
  pb: 2,
  display: 'flex',
  flexDirection: 'column',
  gap: 1.25,
  // Phones get one note per row; from md up the note keeps its own column span
  // out of the 12-column board, and its row span lets dense packing tuck short
  // notes beside a tall one.
  gridColumn: { xs: 'span 1', md: `span ${size.cols}` },
  gridRow: { xs: 'auto', md: `span ${rowSpan}` },
  height: size.height ? `${size.height}px` : 'auto',
  alignSelf: 'start',
  touchAction: dragging ? 'none' : 'auto',
  // Drag and reorder motion: the card owns the transform, the drag hook only
  // feeds the custom properties inside it (see logic/dragMotion.js).
  transform: DRAG_TRANSFORM,
  transition: DRAG_TRANSITION,
  // The offsets still apply — the card just jumps to each new slot instead of
  // sliding, which is the point of the setting.
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  // The dragged card is lifted off the board and rides above its neighbours
  // while they slide underneath it. `scale` is a separate property from
  // `transform`, so the lift cannot disturb the drag offset.
  zIndex: dragging ? 5 : 'auto',
  scale: dragging ? '1.02' : '1',
  boxShadow: dragging ? 8 : 0,
  willChange: dragging ? 'transform' : 'auto',
});

const toolbarSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.25,
  mb: -0.5,
};

const handleSx = {
  cursor: 'grab',
  touchAction: 'none',
  '&:active': { cursor: 'grabbing' },
};

const titleSx = {
  '& .MuiInputBase-input': {
    fontWeight: 700,
  },
};

// Matches the outlined title field it stands in for, so switching does not
// shift the card.
const titlePreviewSx = {
  minWidth: 0,
  px: 1.75,
  py: 0.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  cursor: 'text',
};

const titleTextSx = { fontWeight: 700, minHeight: 24, overflowWrap: 'anywhere' };

// Mirrors the outlined TextField the preview replaces, so switching modes does
// not make the card jump.
const previewSx = {
  minWidth: 0,
  flex: 1,
  minHeight: 0,
  p: 1.25,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  cursor: 'text',
  overflowY: 'auto',
};

const previewLabelSx = {
  display: 'block',
  color: 'text.secondary',
  mb: 0.5,
};

const bodySx = {
  minWidth: 0,
  flex: 1,
  minHeight: 0,
  '& .MuiInputBase-root': {
    alignItems: 'flex-start',
    height: 1,
    overflowY: 'auto',
  },
  '& .MuiInputBase-inputMultiline': {
    overflowY: 'auto',
    overflowWrap: 'anywhere',
  },
};

const resizeGripSx = {
  position: 'absolute',
  right: 2,
  bottom: 2,
  width: 16,
  height: 16,
  cursor: 'nwse-resize',
  touchAction: 'none',
  borderRight: '2px solid',
  borderBottom: '2px solid',
  borderColor: 'divider',
  borderBottomRightRadius: 1,
  '&:hover, &:focus-visible': { borderColor: 'primary.main' },
};
