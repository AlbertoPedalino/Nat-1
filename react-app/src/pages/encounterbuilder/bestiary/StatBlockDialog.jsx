import { useCallback, useMemo, useState } from 'react';
import { Box, Button, Divider } from '@mui/material';
import { Plus, ScrollText } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import DiceToast from '../../../shared/character/dice/DiceToast.jsx';
import { buildEncounterDiceToast } from '../../../shared/character/dice/encounterDiceToast.js';
import PlayerSheetPanel from '../campaign/PlayerSheetPanel.jsx';

import { StatBlockHeader, StatBlockSheet } from '../../../shared/bestiary/StatBlockSheet.jsx';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import SidePanel from '../../../shared/ui/SidePanel.jsx';
import StatePanel from '../../../shared/ui/StatePanel.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

export default function StatBlockDialog() {
  const { state, dispatch } = useEncounterBuilder();
  const monster = state.selectedStatblock?.monster;
  if (state.view === 'combat' || !monster) return null;
  const close = () => dispatch({ type: 'closeStatblock' });

  return (
    <SheetDialog open onClose={close} maxWidth="md" topPad={2} showClose closeLabel="Close statblock">
      {/* Room for the dialog's corner X, so a long name never runs under it. */}
      <Box sx={{ pr: 4 }}>
        <StatBlockHeader monster={monster} />
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <StatBlockBody monster={monster} allowAdd />
    </SheetDialog>
  );
}

export function StatBlockPanel() {
  const { state, dispatch } = useEncounterBuilder();
  const selection = state.selectedStatblock;
  const monster = selection?.monster;
  const isPlayerSelection = selection && !monster && selection.combatantId != null;
  const close = () => dispatch({ type: 'closeStatblock' });

  if (!selection) return <EmptyStatBlock />;

  if (isPlayerSelection) {
    return <PlayerSheetPanel selection={selection} onClose={close} sx={sidePlacementSx} />;
  }

  if (!monster) return <EmptyStatBlock />;

  return (
    <SidePanel header={<StatBlockHeader monster={monster} />} onClose={close} closeLabel="Close statblock" sx={sidePlacementSx}>
      <StatBlockBody monster={monster} allowAdd={false} />
    </SidePanel>
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
            startIcon={<Plus size={ICON_SIZES.md} />}
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

// The panel before anything is selected (or after a monster is gone).
function EmptyStatBlock() {
  return (
    <StatePanel icon={ScrollText} title="Statblock" sx={sidePlacementSx}>
      Click a monster or player combatant to inspect it here.
    </StatePanel>
  );
}

// The side column beside the roster: kept in view while the roster scrolls on
// a wide screen.
const sidePlacementSx = {
  alignSelf: 'start',
  position: { lg: 'sticky' },
  top: { lg: 82 },
  maxHeight: { lg: 'calc(100vh - 104px)' },
};
