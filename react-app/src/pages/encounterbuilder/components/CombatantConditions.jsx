import { useState } from 'react';
import { Box, Button, Chip, Collapse } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  ASSIGNABLE_CONDITIONS,
  EXHAUSTION_KEY,
  conditionLabel,
  normalizeConditions,
} from '../../../shared/character/conditions.js';
import {
  CONDITION_ACCENT,
  ConditionCard,
  ConditionPill,
} from '../../../shared/character/ConditionChips.jsx';
import { useConditionEntries } from '../hooks/useConditionEntries.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

// Conditions on a combatant. Active ones are always visible so a GM can scan the
// initiative list and see who is prone without opening anything; the grid to
// assign them hides behind a disclosure, the same shape as the HP modifiers row.
//
// Exhaustion is shown but not editable here: it is graded 0-6 and that level
// lives on the character sheet, which this surface does not sync. Offering a
// toggle would let a GM strip the condition and leave the level behind.

// Denser than the sheet's: these sit inside an initiative row, not a panel.
const pillSx = { height: 20, fontSize: '0.62rem' };

export default function CombatantConditions({ combatant }) {
  const { dispatch } = useEncounterBuilder();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState([]);
  const conditionEntries = useConditionEntries();
  const active = normalizeConditions(combatant.activeConditions);
  const assignable = active.filter((key) => key !== EXHAUSTION_KEY);

  const toggle = (key) => dispatch({ type: 'toggleCombatantCondition', id: combatant.id, key });
  const toggleCard = (key) => setExpanded((prev) => (
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
  ));
  // Derived from the live active list, so removing a condition takes its card
  // with it — no stale-state pruning needed.
  const openCards = active.filter((key) => expanded.includes(key) && conditionEntries?.[key]?.length);

  return (
    <Box sx={wrapperSx}>
      <Box sx={rowSx}>
        {active.map((key) => (
          <ConditionPill
            key={key}
            label={conditionLabel(key)}
            hasDesc={!!conditionEntries?.[key]?.length}
            isOpen={expanded.includes(key)}
            onToggle={() => toggleCard(key)}
            onRemove={key === EXHAUSTION_KEY ? undefined : () => toggle(key)}
            readOnlyReason={key === EXHAUSTION_KEY ? 'Exhaustion is graded — set it on the character sheet' : null}
            sx={pillSx}
          />
        ))}
        <Button
          size="small"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          startIcon={open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          sx={toggleSx}
        >
          Conditions{assignable.length ? ` (${assignable.length})` : ''}
        </Button>
        {assignable.length > 0 ? (
          <Button
            size="small"
            onClick={() => dispatch({ type: 'clearCombatantConditions', id: combatant.id })}
            sx={clearSx}
          >
            Clear
          </Button>
        ) : null}
      </Box>

      {openCards.length > 0 ? (
        <Box sx={cardStackSx}>
          {openCards.map((key) => (
            <ConditionCard
              key={key}
              label={conditionLabel(key)}
              entries={conditionEntries[key]}
              onClose={() => toggleCard(key)}
              fontSize="0.66rem"
            />
          ))}
        </Box>
      ) : null}

      <Collapse in={open} unmountOnExit sx={collapseSx}>
        <Box sx={gridSx}>
          {ASSIGNABLE_CONDITIONS.map((condition) => {
            const isOn = active.includes(condition.key);
            return (
              <Chip
                key={condition.key}
                size="small"
                label={condition.label}
                variant={isOn ? 'filled' : 'outlined'}
                onClick={() => toggle(condition.key)}
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  cursor: 'pointer',
                  justifyContent: 'flex-start',
                  ...(isOn ? { color: CONDITION_ACCENT, borderColor: CONDITION_ACCENT, bgcolor: alpha(CONDITION_ACCENT, 0.14) } : null),
                }}
              />
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}

const wrapperSx = { width: '100%', minWidth: 0 };

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 0.5,
  minHeight: 22,
};

const toggleSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.5,
  py: 0,
  color: 'text.secondary',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  '& .MuiButton-startIcon': { mr: 0.4 },
  '&:hover': { color: 'text.primary' },
};

const clearSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.5,
  py: 0,
  color: 'text.secondary',
  fontSize: '0.62rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  '&:hover': { color: 'error.main' },
};

const cardStackSx = { display: 'flex', flexDirection: 'column', gap: 0.4, mt: 0.5 };

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
  gap: 0.4,
  mt: 0.6,
};

// A collapsed Collapse still occupies a slot in the parent flex gap; MUI tags
// that state once the exit transition ends, so drop it out of layout there.
const collapseSx = { '&.MuiCollapse-hidden': { display: 'none' } };
