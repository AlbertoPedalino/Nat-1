import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, CircularProgress, IconButton, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography,
} from '@mui/material';
import { Check, ChevronLeft, ChevronRight, EyeOff, Swords } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { battleMapSurfaceSx } from '../map/battleMapSurface.js';

// The turn order over the battle map. What it lists is decided by the caller:
// the pieces the viewer can see (players, projector) or the whole shown fight
// (the GM). Only the GM gets the controls — next/previous turn and the choice
// of which fight the scene shows. `onEntryClick(entry)` makes the entries
// buttons; `onEntryPointerDown(entry, event)` lets an entry marked `placeable`
// be dragged onto the board.
export default function InitiativeStrip({
  entries = [],
  round = null,
  controls = false,
  busy = false,
  choices = [],
  selectedKey = null,
  onStep,
  onChoose,
  onEntryClick = null,
  onEntryPointerDown = null,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const listRef = useRef(null);
  const activeRef = useRef(null);
  const activeKey = entries.find((entry) => entry.active)?.key || null;

  // The one acting stays in view on a long order. The list scrolls by itself:
  // scrollIntoView would also move every scrollable box around it — the map
  // jumped to follow the piece on every turn.
  useEffect(() => {
    const list = listRef.current;
    const item = activeRef.current;
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    const offset = item.getBoundingClientRect().left - list.getBoundingClientRect().left;
    const left = list.scrollLeft + offset - (list.clientWidth - item.offsetWidth) / 2;
    if (typeof list.scrollTo === 'function') list.scrollTo({ left, behavior: 'smooth' });
    else list.scrollLeft = left;
  }, [activeKey]);

  if (!entries.length) return null;

  return (
    <Box data-viewport-control sx={stripRootSx}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={stripSx}>
        {controls ? (
          <Tooltip title="Previous turn">
            <span>
              <IconButton size="small" aria-label="Previous turn" disabled={busy} onClick={() => onStep?.(-1)} sx={stepButtonSx}>
                <ChevronLeft size={16} />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        {round ? <Typography sx={roundSx}>Round {round}</Typography> : null}
        <Box component="ol" ref={listRef} aria-label="Initiative order" sx={listSx}>
          {entries.map((entry) => (
            <Box
              component="li"
              key={entry.key}
              ref={entry.active ? activeRef : null}
              aria-current={entry.active ? 'step' : undefined}
              title={entryTitle(entry, controls)}
              sx={[entrySx, entry.active && activeEntrySx, entry.dead && deadEntrySx]}
            >
              <Box
                component={onEntryClick ? 'button' : 'span'}
                type={onEntryClick ? 'button' : undefined}
                aria-label={onEntryClick ? entry.name : undefined}
                onClick={onEntryClick ? () => onEntryClick(entry) : undefined}
                onPointerDown={onEntryPointerDown && entry.placeable
                  ? (event) => onEntryPointerDown(entry, event)
                  : undefined}
                sx={[entryBodySx, onEntryClick && entryButtonSx, entry.placeable && onEntryPointerDown && placeableSx]}
              >
              <Box
                aria-hidden
                sx={[
                  avatarSx,
                  { bgcolor: entry.imageUrl ? 'transparent' : (entry.color || 'secondary.main') },
                  !entry.onBoard && offBoardAvatarSx,
                ]}
              >
                {entry.imageUrl
                  ? <Box component="img" src={entry.imageUrl} alt="" sx={avatarImageSx} />
                  : initial(entry.name)}
              </Box>
              <Typography component="span" sx={[nameSx, !entry.active && compactNameSx]}>{entry.name}</Typography>
              {controls && entry.hiddenFromPlayers ? (
                <Box component="span" aria-label="Hidden from players" sx={hiddenBadgeSx}><EyeOff size={10} /></Box>
              ) : null}
              </Box>
            </Box>
          ))}
        </Box>
        {controls ? (
          <>
            <Tooltip title="Next turn">
              <span>
                <IconButton size="small" aria-label="Next turn" disabled={busy} onClick={() => onStep?.(1)} sx={stepButtonSx}>
                  {busy ? <CircularProgress size={14} /> : <ChevronRight size={16} />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Which fight this scene shows">
              <IconButton
                size="small"
                aria-label="Choose the fight shown"
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                sx={stepButtonSx}
              >
                <Swords size={14} />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
      </Stack>
      {controls ? (
        <FightMenu
          anchor={menuAnchor}
          choices={choices}
          selectedKey={selectedKey}
          onChoose={onChoose}
          onClose={() => setMenuAnchor(null)}
        />
      ) : null}
    </Box>
  );
}

// Off the map: with pieces from a fight on the board and none shown, the GM
// starts the initiative from the scene's own actions.
export function InitiativeButton({ choices = [], onChoose }) {
  const [anchor, setAnchor] = useState(null);
  if (!choices.length) return null;
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Swords size={14} />}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        Initiative
      </Button>
      <FightMenu anchor={anchor} choices={choices} onChoose={onChoose} onClose={() => setAnchor(null)} />
    </>
  );
}

function FightMenu({ anchor, choices, selectedKey = null, onChoose, onClose }) {
  return (
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={onClose}>
      {choices.map((choice) => (
        <MenuItem
          key={choice.key}
          selected={choice.key === selectedKey}
          onClick={() => { onClose(); onChoose?.(choice); }}
        >
          <ListItemText primary={choice.name} />
          {choice.key === selectedKey ? <Check size={14} /> : null}
        </MenuItem>
      ))}
      {selectedKey ? (
        <MenuItem onClick={() => { onClose(); onChoose?.(null); }}>
          <ListItemText primary="Hide initiative" />
        </MenuItem>
      ) : null}
    </Menu>
  );
}

function initial(name) {
  return String(name || '?').trim().charAt(0).toUpperCase() || '?';
}

function entryTitle(entry, gmView) {
  const notes = [];
  if (entry.dead) notes.push('dead');
  if (gmView && !entry.onBoard) notes.push(entry.placeable ? 'not on the board: drag it onto the map' : 'not on the board');
  else if (gmView && entry.hiddenFromPlayers) notes.push('hidden from players');
  return notes.length ? `${entry.name} (${notes.join(', ')})` : entry.name;
}

// Top centre: the picture switch holds the top left, the tools and the sheet
// button the top right.
const stripRootSx = {
  position: 'absolute',
  top: 8,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 6,
  maxWidth: { xs: 'calc(100% - 104px)', md: 'min(760px, calc(100% - 340px))' },
  display: 'flex',
  justifyContent: 'center',
  cursor: 'default',
};

const stripSx = {
  ...battleMapSurfaceSx,
  borderRadius: 1,
  px: 0.5,
  py: 0.375,
  minWidth: 0,
  maxWidth: '100%',
  boxShadow: `0 6px 18px ${vttAlpha(VTT_COLORS.black, 0.5)}`,
};

// Its own line box, centred on the faces beside it: a serif's default line
// height left the words riding above the middle of the strip.
const roundSx = {
  flexShrink: 0,
  alignSelf: 'center',
  display: 'flex',
  alignItems: 'center',
  height: 24,
  lineHeight: 1,
  px: 0.75,
  color: 'gmboard.vtt.gold',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
};

const listSx = {
  display: 'flex',
  gap: 0.5,
  m: 0,
  p: 0,
  listStyle: 'none',
  minWidth: 0,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
};

const entrySx = {
  position: 'relative',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  maxWidth: 132,
  py: 0.25,
  pl: 0.25,
  pr: 0.75,
  borderRadius: 999,
  border: '1px solid transparent',
  color: VTT_COLORS.panelText,
  transition: 'background-color 160ms ease, border-color 160ms ease',
};

const entryBodySx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  minWidth: 0,
};

const entryButtonSx = {
  appearance: 'none',
  border: 0,
  p: 0,
  m: 0,
  bgcolor: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: 999,
  '&:focus-visible': { outline: '2px solid', outlineColor: 'gmboard.vtt.gold', outlineOffset: 2 },
};

// Dragged onto the board like a piece from the Pieces panel; on touch, after
// a short hold, so the strip still scrolls under a finger.
const placeableSx = {
  cursor: 'grab',
  touchAction: 'pan-x',
};

// The same colour as the halo on the acting piece, so the two read as one.
const activeEntrySx = {
  bgcolor: vttAlpha(VTT_COLORS.turnActive, 0.16),
  borderColor: VTT_COLORS.turnActive,
  color: VTT_COLORS.parchment,
  boxShadow: `0 0 10px ${vttAlpha(VTT_COLORS.turnActive, 0.5)}`,
};

const deadEntrySx = {
  opacity: 0.45,
  filter: 'grayscale(0.8)',
};

const avatarSx = {
  width: 24,
  height: 24,
  flexShrink: 0,
  borderRadius: '50%',
  overflow: 'hidden',
  display: 'grid',
  placeItems: 'center',
  border: `1px solid ${vttAlpha(VTT_COLORS.black, 0.6)}`,
  color: VTT_COLORS.parchment,
  fontSize: '0.7rem',
  fontWeight: 700,
};

const offBoardAvatarSx = {
  border: `1px dashed ${vttAlpha(VTT_COLORS.gold, 0.8)}`,
};

const avatarImageSx = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const nameSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.72rem',
  lineHeight: 1.2,
};

// On a phone only the one acting keeps a name; the rest are faces.
const compactNameSx = {
  display: { xs: 'none', sm: 'block' },
};

const hiddenBadgeSx = {
  display: 'inline-flex',
  color: 'gmboard.vtt.gold',
  flexShrink: 0,
};

const stepButtonSx = {
  flexShrink: 0,
  color: 'gmboard.vtt.gold',
};
