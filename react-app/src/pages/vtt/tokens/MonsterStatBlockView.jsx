import { useCallback } from 'react';
import { Box } from '@mui/material';
import { StatBlockHeader, StatBlockSheet } from '../../../shared/bestiary/StatBlockSheet.jsx';
import GmRollsShownSwitch from '../../../shared/character/dice/GmRollsShownSwitch.jsx';

// The stat block of a creature of the shown fight, opened by the GM from its
// piece or its entry in the initiative. Rolls go to the battle map's dice and
// log; d20 tests take the advantage or disadvantage of the combatant's current
// conditions.
//
// Shown where the character sheets are — the side column beside the board, or
// the floating sheet in fullscreen — so a creature and a character are looked
// up in the same place, and the board stays uncovered.
// Who sees its rolls is the GM's switch for the campaign (rollVisibility.js),
// the same one as on the map's dice and in the encounter builder.
export default function MonsterStatBlockView({
  monster, legendaryGroups, conditions, campaignId, onRoll, onClose,
}) {

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
        <GmRollsShownSwitch campaignId={campaignId} sx={{ mb: 1 }} />
        <StatBlockSheet
          monster={monster}
          legendaryGroups={legendaryGroups}
          conditions={conditions}
          onRoll={onRoll}
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
