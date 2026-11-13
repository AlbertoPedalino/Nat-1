import { Box } from '@mui/material';
import {
  EXHAUSTION_KEY,
  conditionLabel,
  normalizeConditions,
} from '../../../shared/character/combat/conditions.js';
import {
  ConditionCard,
  ConditionPill,
  ConditionToggleGrid,
} from '../../../shared/character/combat/ConditionChips.jsx';
import { useConditionEntries } from '../../../shared/character/combat/useConditionEntries.js';
import { useOpenConditionCards } from '../../../shared/character/combat/useOpenConditionCards.js';
import { useEncounterDispatch } from '../state/EncounterBuilderContext.jsx';
import MarkerRow from './MarkerRow.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';

// Conditions on a combatant. Active ones are always visible so a GM can scan the
// initiative list and see who is prone without opening anything; the grid to
// assign them hides behind a disclosure. MarkerRow owns that frame, shared with
// the reminders row directly below so the two cannot drift apart.
//
// Exhaustion is shown but not editable here: it is graded 0-6 and that level
// lives on the character sheet, which this surface does not sync. Offering a
// toggle would let a GM strip the condition and leave the level behind.

// Denser than the sheet's: these sit inside an initiative row, not a panel.
const pillSx = { height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xs };

export default function CombatantConditions({ combatant }) {
  const dispatch = useEncounterDispatch();
  const conditionEntries = useConditionEntries();
  const active = normalizeConditions(combatant.activeConditions);
  const assignable = active.filter((key) => key !== EXHAUSTION_KEY);
  const cards = useOpenConditionCards(active, conditionEntries);

  const toggle = (key) => dispatch({ type: 'toggleCombatantCondition', id: combatant.id, key });
  const openCards = cards.openKeys;

  return (
    <MarkerRow
      label="Conditions"
      // Exhaustion is excluded from the count and from Clear because this
      // surface cannot set or drop it; it is still shown as a pill.
      count={assignable.length}
      onClear={() => dispatch({ type: 'clearCombatantConditions', id: combatant.id })}
      pills={active.map((key) => (
        <ConditionPill
          key={key}
          label={conditionLabel(key)}
          hasDesc={cards.hasDesc(key)}
          isOpen={cards.isOpen(key)}
          onToggle={() => cards.toggleCard(key)}
          onRemove={key === EXHAUSTION_KEY ? undefined : () => toggle(key)}
          readOnlyReason={key === EXHAUSTION_KEY ? 'Exhaustion is graded — set it on the character sheet' : null}
          sx={pillSx}
        />
      ))}
      belowRow={openCards.length > 0 ? (
        <Box sx={cardStackSx}>
          {openCards.map((key) => (
            <ConditionCard
              key={key}
              label={conditionLabel(key)}
              entries={conditionEntries[key]}
              onClose={() => cards.toggleCard(key)}
              fontSize={FONT_SIZES.sm}
            />
          ))}
        </Box>
      ) : null}
    >
      <ConditionToggleGrid active={active} onToggle={toggle} sx={gridSx} chipSx={gridChipSx} />
    </MarkerRow>
  );
}

const gridChipSx = { height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xs };

const cardStackSx = { display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 };

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
  gap: 0.5,
  mt: 0.5,
};
