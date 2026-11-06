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
} from './tokenSpriteStyles.js';

// The first reminder written inside a creature's cell, plus a count of the rest.
export function TokenReminderLine({ reminders }) {
  return (
    <Box data-token-reminders sx={inlineRemindersSx}>
      <Box component="span" title={reminders[0].text} sx={reminderInlineSx}>
        {reminders[0].text}
      </Box>
      {reminders.length > 1 ? (
        <Box
          component="span"
          title={reminders.slice(1).map((effect) => effect.text).join(', ')}
          sx={{ ...reminderInlineSx, flexShrink: 0 }}
        >
          +{reminders.length - 1}
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
