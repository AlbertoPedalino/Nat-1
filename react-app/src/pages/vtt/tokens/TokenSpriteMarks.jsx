import { Box } from '@mui/material';
import { effectId } from '../../../shared/character/combat/combatEffects.js';
import ConditionTokenPill from './ConditionTokenPill.jsx';
import {
  aboveSx,
  pillsSx,
  remindersSx,
  reminderSx,
  inlineRemindersSx,
  reminderInlineSx,
  reminderCountSx,
} from './tokenSpriteStyles.js';

// How many reminders are written inside a creature's cell, side by side; the
// rest are counted ("+2") and open above the piece on hover or tap.
const INLINE_REMINDERS = 2;

// The reminders written in the cell and the ones left for the count: the one
// rule for the line and for what opens above the piece.
export function splitReminders(reminders) {
  return { shown: reminders.slice(0, INLINE_REMINDERS), rest: reminders.slice(INLINE_REMINDERS) };
}

// The first reminders written inside a creature's cell, plus a count of the rest.
export function TokenReminderLine({ reminders }) {
  const { shown, rest } = splitReminders(reminders);
  return (
    <Box data-token-reminders sx={inlineRemindersSx}>
      {shown.map((effect) => (
        <Box key={effectId(effect)} component="span" title={effect.text} sx={reminderInlineSx}>
          {effect.text}
        </Box>
      ))}
      {rest.length ? (
        <Box
          component="span"
          title={rest.map((effect) => effect.text).join(', ')}
          sx={reminderCountSx}
        >
          +{rest.length}
        </Box>
      ) : null}
    </Box>
  );
}

// Opened on hover or tap: one pill each, wrapped, since a run-on sentence of
// six states is read as a wall while pills are counted at a glance; then the
// reminders the cell had no room for. Above the cell and over its neighbours,
// but only while someone is looking at it.
export function TokenExpandedMarks({
  tokenId,
  conditions,
  reminders,
  conditionEntries,
  remotelyExpanded,
  presentedInspection,
  onInspectionChange,
  onPointerEnter,
  onPointerLeave,
}) {
  return (
    <Box sx={aboveSx} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      {conditions.length ? (
        <Box sx={pillsSx}>
          {conditions.map((key) => (
            <ConditionTokenPill
              key={key}
              conditionKey={key}
              entries={conditionEntries[key]}
              tooltipOpen={remotelyExpanded ? presentedInspection.conditionKey === key : undefined}
              onInspect={(conditionKey) => onInspectionChange?.({
                tokenId,
                conditionKey,
              })}
            />
          ))}
        </Box>
      ) : null}
      {reminders.length ? (
        <Box sx={remindersSx}>
          {reminders.map((effect) => (
            <Box key={effectId(effect)} component="span" title={effect.text} sx={reminderSx}>
              {effect.text}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
