import { useCallback, useState } from 'react';
import {
  Box, FormControlLabel, Paper, Portal, Switch,
} from '@mui/material';
import { StatBlockHeader, StatBlockSheet } from '../../encounterbuilder/bestiary/StatBlockDialog.jsx';
import { fullscreenContainer } from '../map/fullscreenContainer.js';
import { battleMapDialogPaperSx, battleMapDialogTitleSx } from '../map/battleMapSurface.js';
import { APP_TOP_BAR_HEIGHT } from '../../../app/navigation/AppTopBar.jsx';

// Per GM device, like the builder's own "show to players": most monster rolls
// are the GM's business, and the default says so.
const PUBLIC_KEY = 'gb:vtt:creature-rolls-public';

function readPublic() {
  try { return localStorage.getItem(PUBLIC_KEY) === '1'; } catch (_) { return false; }
}

// The stat block of a creature of the shown fight, opened by the GM from its
// piece or its entry in the initiative. Rolls go to the battle map's dice and
// log; d20 tests take the advantage or disadvantage of the combatant's current
// conditions.
//
// A side panel, not a modal: the board stays live beside it — pieces move,
// turns pass, menus open — and clicking another creature shows its block here.
export default function MonsterStatBlockPanel({
  open, monster, legendaryGroups, conditions, onRoll, onClose,
}) {
  const [shown, setShown] = useState(readPublic);
  const toggleShown = useCallback((event) => {
    const next = event.target.checked;
    setShown(next);
    try { localStorage.setItem(PUBLIC_KEY, next ? '1' : '0'); } catch (_) {}
  }, []);
  const handleRoll = useCallback((roll) => {
    onRoll?.({ ...roll, visibility: shown ? 'public' : 'gm' });
  }, [onRoll, shown]);

  // Escape closes it, unless something inside it (a roll's menu) has its own
  // use for the key.
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) onClose?.();
  }, [onClose]);

  if (!open || !monster) return null;
  return (
    <Portal container={fullscreenContainer}>
      <Paper
        role="dialog"
        aria-label={`${monster.name} stat block`}
        data-viewport-control
        onKeyDown={handleKeyDown}
        sx={[battleMapDialogPaperSx, panelSx]}
      >
      <Box sx={[battleMapDialogTitleSx, titleSx]}>
        <StatBlockHeader monster={monster} onClose={onClose} />
      </Box>
      <Box sx={bodySx}>
        <FormControlLabel
          control={<Switch size="small" checked={shown} onChange={toggleShown} />}
          label={shown ? 'Rolls shown to players' : 'Rolls for the GM only'}
          sx={switchSx}
        />
        <StatBlockSheet
          monster={monster}
          legendaryGroups={legendaryGroups}
          conditions={conditions}
          onRoll={handleRoll}
        />
      </Box>
      </Paper>
    </Portal>
  );
}

// How wide it is beside the board, for whatever has to make room for it (the
// dice toast moves to its left).
export const STAT_BLOCK_PANEL_WIDTH = 480;

// On the right of the screen, over the board, under the app's top bar (whose
// height it starts below — under it, the close button could not be reached),
// menus and dialogs. On a phone it takes the top half, so the dice toast in
// the bottom corner stays in sight.
const panelSx = {
  position: 'fixed',
  zIndex: 1250,
  top: `calc(${APP_TOP_BAR_HEIGHT} + 8px)`,
  right: { xs: 8, sm: 16 },
  bottom: { xs: 'auto', sm: 16 },
  maxHeight: { xs: '52vh', sm: 'none' },
  width: { xs: 'calc(100% - 16px)', sm: STAT_BLOCK_PANEL_WIDTH },
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const bodySx = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  p: 2,
  borderTop: '1px solid',
  borderTopColor: 'gmboard.vtt.goldTint',
};

// The header carries its own typography (name, type line, source chip); the
// battle-map title style only lends it the surface and the rule beneath.
const titleSx = {
  position: 'relative',
  flexShrink: 0,
  px: 2,
  py: 1.5,
  pr: 7,
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 'inherit',
  letterSpacing: 0,
};

const switchSx = {
  mb: 1,
  '& .MuiFormControlLabel-label': { fontSize: '0.8rem', color: 'text.secondary' },
};
