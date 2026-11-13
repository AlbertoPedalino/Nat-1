import { useState, useSyncExternalStore } from 'react';
import { Box, Button, Chip, TextField } from '@mui/material';
import { X } from 'lucide-react';
import {
  MAX_EFFECTS,
  MAX_EFFECT_TEXT,
  effectId,
  normalizeEffects,
} from './combatEffects.js';
import {
  forgetStoredReminder,
  getReminderHistory,
  rememberReminder,
  subscribeReminderHistory,
  suggestReminders,
} from './reminderHistory.js';
import { CONTROL_FONT_SIZES, FONT_SIZES } from '../../ui/fonts.js';
import { UI_COLORS } from '../../ui/colors.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { markerDensitySx, markerSuggestedSx } from './markerChipStyles.js';
import MarkerChip from './MarkerChip.jsx';
import MarkerManager from './MarkerManager.jsx';

// Reminder chip and field, shared by the character sheet, the battle-map token
// menu and the encounter builder: a creature's reminders are one list, so
// whoever sets one and whoever reads it see the same thing (as ConditionChips
// does for conditions).
//
// The light blue is the reminder colour everywhere, the piece on the map
// included — which is why the chips do not reuse the conditions accent. Their
// look is the marker's (markerChipStyles.js), as the conditions': a reminder on
// the creature tinted blue, one offered from the history a plain button.

export const REMINDER_ACCENT = UI_COLORS.info;

// A creature's reminders by name, each removable, and the field that adds one,
// in the markers' frame (MarkerManager): the sheet's panel, the encounter
// combatant's line, the map's piece menu. `effects` is the list; the caller
// owns the writes. `density` sizes the chips for their surface; the field stays
// open (one tap to add) unless the caller passes `collapse`. Anything else
// (`inline`, `label`, `onClear`, `collapse`) is the frame's.
export function ReminderEditor({ effects, onAdd, onRemove, disabled = false, density, collapse = false, ...frame }) {
  const reminders = normalizeEffects(effects);
  return (
    <MarkerManager
      {...frame}
      collapse={collapse}
      count={reminders.length}
      pills={reminders.map((effect) => (
        <ReminderChip
          key={effectId(effect)}
          effect={effect}
          density={density}
          onRemove={disabled ? undefined : () => onRemove(effectId(effect))}
        />
      ))}
    >
      {disabled ? null : <ReminderField effects={reminders} onAdd={onAdd} density={density} />}
    </MarkerManager>
  );
}

export function ReminderChip({ effect, onRemove, density }) {
  return (
    <MarkerChip
      label={effect.text}
      accent={REMINDER_ACCENT}
      onRemove={onRemove}
      removeLabel={`Remove ${effect.text}`}
      density={density}
    />
  );
}

// The list is capped, and a cap that silently swallows an entry is worse than
// no cap: at the limit the field is disabled and says why, while the chips stay
// removable.
//
// Reminders added before on this device (reminderHistory.js) sit under the
// field as one-tap chips, narrowed by what is typed and minus those already on
// the creature; their × forgets the entry, for typos.
export function ReminderField({ effects, onAdd, density }) {
  const [text, setText] = useState('');
  const history = useSyncExternalStore(subscribeReminderHistory, getReminderHistory, getReminderHistory);
  const active = normalizeEffects(effects);
  const full = active.length >= MAX_EFFECTS;
  const suggestions = suggestReminders(history, { active, query: text });
  const add = (value) => {
    if (!value.trim()) return;
    onAdd(value);
    rememberReminder(value);
    setText('');
  };
  return (
    <Box sx={editorSx}>
      <Box sx={fieldRowSx}>
        <TextField
          size="small"
          placeholder={full ? `Limit of ${MAX_EFFECTS} reminders reached — remove one first` : 'Reminder… (Guidance, Bless)'}
          value={text}
          disabled={full}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Inside the token menu a keystroke would otherwise be taken as the
            // menu's type-ahead.
            event.stopPropagation();
            if (event.key !== 'Enter') return;
            event.preventDefault();
            add(text);
          }}
          slotProps={{ htmlInput: { maxLength: MAX_EFFECT_TEXT, 'aria-label': 'Reminder' } }}
          sx={fieldSx}
        />
        <Button size="small" variant="outlined" onClick={() => add(text)} disabled={full || !text.trim()} sx={addSx}>Add</Button>
      </Box>
      {suggestions.length ? (
        <Box sx={chipsSx} role="group" aria-label="Recent reminders">
          {suggestions.map((entry) => (
            <RecentReminderChip
              key={entry}
              text={entry}
              disabled={full}
              density={density}
              onPick={() => add(entry)}
              onForget={() => forgetStoredReminder(entry)}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

// Offered, not on the creature: the marker ghost (markerSuggestedSx), one tap
// to add yet quieter than the reminders in force.
function RecentReminderChip({ text, disabled, density, onPick, onForget }) {
  return (
    <Chip
      size="small"
      label={text}
      disabled={disabled}
      onClick={onPick}
      onDelete={onForget}
      aria-label={`Add ${text}`}
      deleteIcon={<X size={ICON_SIZES.xxs} aria-label={`Forget ${text}`} />}
      sx={[markerSuggestedSx(REMINDER_ACCENT), markerDensitySx(density)]}
    />
  );
}

const editorSx = { display: 'flex', flexDirection: 'column', gap: 0.5 };

const chipsSx = { display: 'flex', flexWrap: 'wrap', gap: 0.25 };

const fieldRowSx = { display: 'flex', alignItems: 'center', gap: 0.5 };

const fieldSx = {
  flex: '1 1 auto',
  minWidth: 0,
  '& .MuiInputBase-input': { py: 0.5, fontSize: FONT_SIZES.sm },
};

const addSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.75,
  py: 0,
  // Beside a dense field: the controls' small label.
  fontSize: CONTROL_FONT_SIZES.small,
};
