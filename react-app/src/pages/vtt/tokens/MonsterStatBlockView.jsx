import { useCallback, useState } from 'react';
import { Box, FormControlLabel, Switch } from '@mui/material';
import { StatBlockHeader, StatBlockSheet } from '../../encounterbuilder/bestiary/StatBlockDialog.jsx';

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
// Shown where the character sheets are — the side column beside the board, or
// the floating sheet in fullscreen — so a creature and a character are looked
// up in the same place, and the board stays uncovered.
export default function MonsterStatBlockView({
  monster, legendaryGroups, conditions, onRoll, onClose,
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

  if (!monster) return null;
  return (
    <Box
      role="region"
      aria-label={`${monster.name} stat block`}
      onKeyDown={handleKeyDown}
    >
      <Box sx={headerSx}>
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
    </Box>
  );
}

const headerSx = {
  position: 'relative',
  px: 2,
  py: 1.5,
  borderBottom: '1px solid',
  borderBottomColor: 'gmboard.vtt.goldBorder',
};

const bodySx = {
  p: 2,
};

const switchSx = {
  mb: 1,
  '& .MuiFormControlLabel-label': { fontSize: '0.8rem', color: 'text.secondary' },
};
