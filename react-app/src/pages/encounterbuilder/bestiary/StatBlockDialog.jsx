import { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import DiceToast from '../../../shared/character/dice/DiceToast.jsx';
import { buildEncounterDiceToast } from '../../../shared/character/dice/encounterDiceToast.js';
import PlayerSheetPanel from '../campaign/PlayerSheetPanel.jsx';

import { StatBlockHeader, StatBlockSheet } from '../../../shared/bestiary/StatBlockSheet.jsx';

export default function StatBlockDialog() {
  const { state, dispatch } = useEncounterBuilder();
  const monster = state.selectedStatblock?.monster;
  if (state.view === 'combat' || !monster) return null;

  return (
    <Dialog open onClose={() => dispatch({ type: 'closeStatblock' })} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 7, position: 'relative' }}>
        <StatBlockHeader monster={monster} onClose={() => dispatch({ type: 'closeStatblock' })} />
      </DialogTitle>
      <DialogContent dividers>
        <StatBlockBody monster={monster} allowAdd />
      </DialogContent>
    </Dialog>
  );
}

export function StatBlockPanel() {
  const { state, dispatch } = useEncounterBuilder();
  const selection = state.selectedStatblock;
  const monster = selection?.monster;
  const isPlayerSelection = selection && !monster && selection.combatantId != null;

  if (!selection) {
    return (
      <Paper sx={statPanelSx}>
        <Stack spacing={1} sx={{ p: 2, minHeight: 220, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Typography variant="h2">Statblock</Typography>
          <Typography sx={{ color: 'text.secondary' }}>Click a monster or player combatant to inspect it here.</Typography>
        </Stack>
      </Paper>
    );
  }

  if (isPlayerSelection) {
    return (
      <Paper sx={statPanelSx}>
        <PlayerSheetPanel selection={selection} onClose={() => dispatch({ type: 'closeStatblock' })} />
      </Paper>
    );
  }

  if (!monster) {
    return (
      <Paper sx={statPanelSx}>
        <Stack spacing={1} sx={{ p: 2, minHeight: 220, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Typography variant="h2">Statblock</Typography>
          <Typography sx={{ color: 'text.secondary' }}>Click a monster or player combatant to inspect it here.</Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={statPanelSx}>
      <Box sx={statPanelHeaderSx}>
        <StatBlockHeader monster={monster} onClose={() => dispatch({ type: 'closeStatblock' })} />
      </Box>
      <Divider />
      <Box sx={statPanelBodySx}>
        <StatBlockBody monster={monster} allowAdd={false} />
      </Box>
    </Paper>
  );
}

function StatBlockBody({ monster, allowAdd = false }) {
  const { state, dispatch, monsterDb, roll } = useEncounterBuilder();
  const [diceToast, setDiceToast] = useState(null);

  // The combatant this stat block was opened for, if any: its conditions
  // decide how its d20 tests roll. A monster looked up in the bestiary has
  // none and rolls straight.
  const combatantId = state.selectedStatblock?.combatantId;
  const combatant = useMemo(() => (
    combatantId == null
      ? null
      : (state.combat?.combatants || []).find((entry) => String(entry.id) === String(combatantId)) || null
  ), [combatantId, state.combat]);

  const handleRoll = useCallback(({ notation, type, advantage, note }) => {
    const result = roll(notation, type, undefined, note, { advantage });
    const toast = buildEncounterDiceToast(result);
    if (toast) setDiceToast(toast);
  }, [roll]);

  return (
    <>
      <StatBlockSheet
        monster={monster}
        legendaryGroups={monsterDb.legendaryGroups}
        conditions={combatant ? combatant.activeConditions || [] : null}
        onRoll={handleRoll}
      >
        {allowAdd && state.selectedStatblock?.combatantId == null ? (
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => {
              dispatch({ type: 'addMonster', monster });
              dispatch({ type: 'closeStatblock' });
            }}
          >
            Add to Encounter
          </Button>
        ) : null}
      </StatBlockSheet>
      {diceToast ? <DiceToast toast={diceToast} onClose={() => setDiceToast(null)} /> : null}
    </>
  );
}

// The stat block itself, with every number that can be rolled. Who rolls it is
// the caller's: the builder's roll log, or the battle map's dice. `conditions`
// are the creature's (its d20 tests take advantage/disadvantage from them);
// null for a monster looked up in the bestiary, which rolls straight.
// `onRoll({ notation, type, advantage, note })`; `children` go at the end.
const statPanelSx = {
  bgcolor: 'background.paper',
  overflow: 'hidden',
  alignSelf: 'start',
  position: { lg: 'sticky' },
  top: { lg: 82 },
  maxHeight: { lg: 'calc(100vh - 104px)' },
};

const statPanelHeaderSx = {
  p: 2,
  position: 'relative',
};

const statPanelBodySx = {
  p: 2,
  overflow: 'auto',
  maxHeight: { xs: 520, lg: 'calc(100vh - 218px)' },
};
