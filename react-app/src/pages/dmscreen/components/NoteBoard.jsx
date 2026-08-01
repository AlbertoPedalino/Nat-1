import { useCallback, useMemo, useState } from 'react';
import {
  Box, Button, IconButton, InputAdornment, Paper, TextField, Tooltip, Typography,
} from '@mui/material';
import { Plus, Search, SearchX, StickyNote, X } from 'lucide-react';
import { useDmScreen } from '../state/DmScreenContext.jsx';
import { BOARD_COLUMNS, GRID_GAP, ROW_UNIT } from '../logic/layout.js';
import { describeNotePosition, moveNote as moveNoteInList } from '../logic/notes.js';
import { nextAnnouncement } from '../logic/announce.js';
import { filterNotes, queryTokens } from '../logic/search.js';
import { useNoteDragReorder } from '../hooks/useNoteDragReorder.js';
import NoteCard from './NoteCard.jsx';

export default function NoteBoard() {
  const { state, dispatch, addNewNote } = useDmScreen();
  const { notes, focusNoteId } = state;
  const [announcement, setAnnouncement] = useState('');
  // The search is a view of the board, not part of it: it stays out of the
  // reducer and out of storage, so reopening a screen never hides notes.
  const [query, setQuery] = useState('');
  const visibleNotes = useMemo(() => filterNotes(notes, query), [notes, query]);
  // Memoised because the cards use the array identity to decide whether the
  // markdown has to be re-processed for highlighting.
  const tokens = useMemo(() => queryTokens(query), [query]);
  // `filterNotes` hands back the very same array when nothing is hidden, which
  // is exactly the condition under which positions on screen still match
  // positions in the list — and therefore the only one where reordering is
  // meaningful.
  const partial = visibleNotes !== notes;

  const updateNote = (id, field, value) => {
    dispatch({ type: 'updateNote', id, field, value });
  };

  // Only real movement is worth announcing, and the reducer's result is one
  // render away — so the message is built from the same pure move the reducer is
  // about to apply, which returns the list untouched when nothing can move.
  const announce = useCallback((message) => {
    setAnnouncement((previous) => nextAnnouncement(previous, message));
  }, []);

  const moveNote = (id, offset) => {
    const moved = moveNoteInList(notes, id, offset);
    if (moved === notes) return;
    dispatch({ type: 'moveNote', id, offset });
    announce(describeNotePosition(moved, id));
  };

  const removeNote = (id) => {
    dispatch({ type: 'removeNote', id });
  };

  const resizeNote = (id, size) => {
    dispatch({ type: 'resizeNote', id, size });
  };

  const reorderNote = useCallback((id, index) => {
    dispatch({ type: 'moveNoteTo', id, index });
  }, [dispatch]);

  // A drag reorders continuously; announcing every step would be noise, so the
  // live region only speaks once the note is dropped — and the hook stays quiet
  // for a drag that never moved anything.
  const announceDrop = useCallback((id) => {
    announce(describeNotePosition(notes, id));
  }, [announce, notes]);

  const { draggingId, registerCard, getHandleProps } = useNoteDragReorder({
    notes,
    onReorder: reorderNote,
    onDrop: announceDrop,
  });

  return (
    <Box sx={boardSx}>
      <Box role="status" aria-live="polite" sx={liveRegionSx}>{announcement}</Box>
      <Box sx={actionsSx}>
        {notes.length > 0 ? (
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }}
            placeholder="Search titles and text"
            size="small"
            slotProps={{
              htmlInput: { 'aria-label': 'Search notes' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} aria-hidden="true" />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <Tooltip title="Clear search (Esc)">
                      <IconButton size="small" aria-label="Clear search" onClick={() => setQuery('')}>
                        <X size={14} />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={searchSx}
          />
        ) : null}
        {/* Always rendered so the live region exists before it has anything to
            say; a region added to the page mid-update is announced unreliably. */}
        <Typography variant="caption" role="status" aria-live="polite" color="text.secondary">
          {partial ? `${visibleNotes.length} of ${notes.length} notes` : ''}
        </Typography>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={addNewNote}>
          Add note
        </Button>
      </Box>

      {notes.length === 0 ? (
        <Paper variant="outlined" sx={emptySx}>
          <StickyNote size={34} aria-hidden="true" />
          <Typography variant="h2">Build your quick-reference screen</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
            Keep house rules, NPC names, session hooks, loot, and reminders close during play.
          </Typography>
          <Button variant="outlined" startIcon={<Plus size={16} />} onClick={addNewNote}>
            Add first note
          </Button>
        </Paper>
      ) : visibleNotes.length === 0 ? (
        <Paper variant="outlined" sx={emptySx}>
          <SearchX size={34} aria-hidden="true" />
          <Typography variant="h2">No notes match that search</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
            Every word has to appear in a note's title or text.
          </Typography>
          {/* Not another "Clear search": two controls with the same accessible
              name are ambiguous for anyone navigating by name. */}
          <Button variant="outlined" onClick={() => setQuery('')}>Show all notes</Button>
        </Paper>
      ) : (
        <Box sx={gridSx}>
          {visibleNotes.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              index={index}
              count={visibleNotes.length}
              reorderable={!partial}
              tokens={tokens}
              focusTitle={focusNoteId === note.id}
              onFocusHandled={() => dispatch({ type: 'clearFocus' })}
              onUpdate={updateNote}
              onMove={moveNote}
              onRemove={removeNote}
              onResize={resizeNote}
              onRegister={registerCard}
              dragHandleProps={getHandleProps(note.id)}
              dragging={draggingId === note.id}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

const boardSx = {
  minWidth: 0,
  width: 1,
};

// Off-screen but still rendered: a `display: none` region is never announced.
const liveRegionSx = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

const actionsSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 1.5,
  mb: 1.5,
};

const searchSx = {
  flex: 1,
  minWidth: 0,
  maxWidth: 420,
  mr: 'auto',
};

const emptySx = {
  borderStyle: 'dashed',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.secondary',
  textAlign: 'center',
  px: { xs: 2, md: 4 },
  py: { xs: 5, md: 7 },
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1.5,
};

const gridSx = {
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    md: `repeat(${BOARD_COLUMNS}, minmax(0, 1fr))`,
  },
  // Short rows + dense packing: notes claim column and row spans, and later
  // small notes back-fill the holes a tall neighbour leaves behind.
  gridAutoRows: { xs: 'auto', md: `${ROW_UNIT}px` },
  gridAutoFlow: { xs: 'row', md: 'row dense' },
  alignItems: 'start',
  gap: `${GRID_GAP}px`,
};
