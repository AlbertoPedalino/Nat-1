import { useState, useSyncExternalStore } from 'react';
import { Box, Button, Chip, TextField } from '@mui/material';
import { alpha } from '@mui/material/styles';
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

// Reminder chip and field, shared by the character sheet, the battle-map token
// menu and the encounter builder: a creature's reminders are one list, so
// whoever sets one and whoever reads it see the same thing (as ConditionChips
// does for conditions).
//
// The light blue is the reminder colour everywhere, the piece on the map
// included — which is why the chips do not reuse the conditions accent.

// A creature's reminders by name, each removable, and the field that adds one.
// `effects` is the list; the caller owns the writes.
export function ReminderEditor({ effects, onAdd, onRemove, disabled = false, fontSize = '0.6rem' }) {
  const reminders = normalizeEffects(effects);
  return (
    <Box sx={editorSx}>
      {reminders.length ? (
        <Box sx={chipsSx}>
          {reminders.map((effect) => (
            <ReminderChip
              key={effectId(effect)}
              effect={effect}
              fontSize={fontSize}
              onRemove={disabled ? undefined : () => onRemove(effectId(effect))}
            />
          ))}
        </Box>
      ) : null}
      {disabled ? null : <ReminderField effects={reminders} onAdd={onAdd} />}
    </Box>
  );
}

// `fontSize` is the one thing the surfaces size differently.
export function ReminderChip({ effect, onRemove, fontSize = '0.62rem' }) {
  return (
    <Chip
      size="small"
      label={effect.text}
      onDelete={onRemove}
      deleteIcon={<X size={12} aria-label={`Remove ${effect.text}`} />}
      sx={(theme) => {
        const accent = theme.palette.info.main;
        return {
          height: 20,
          fontSize,
          maxWidth: '100%',
          color: accent,
          border: 1,
          borderColor: accent,
          bgcolor: alpha(accent, 0.14),
          '& .MuiChip-deleteIcon': { color: accent, '&:hover': { color: accent } },
        };
      }}
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
export function ReminderField({ effects, onAdd }) {
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
        <Button size="small" onClick={() => add(text)} disabled={full || !text.trim()} sx={addSx}>Add</Button>
      </Box>
      {suggestions.length ? (
        <Box sx={chipsSx} role="group" aria-label="Recent reminders">
          {suggestions.map((entry) => (
            <RecentReminderChip
              key={entry}
              text={entry}
              disabled={full}
              onPick={() => add(entry)}
              onForget={() => forgetStoredReminder(entry)}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

// Dashed and faint: offered, not on the creature.
function RecentReminderChip({ text, disabled, onPick, onForget }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={text}
      disabled={disabled}
      onClick={onPick}
      onDelete={onForget}
      aria-label={`Add ${text}`}
      deleteIcon={<X size={11} aria-label={`Forget ${text}`} />}
      sx={(theme) => {
        const accent = theme.palette.info.main;
        return {
          height: 18,
          fontSize: '0.56rem',
          maxWidth: '100%',
          color: alpha(accent, 0.8),
          borderStyle: 'dashed',
          borderColor: alpha(accent, 0.5),
          '& .MuiChip-deleteIcon': { color: alpha(accent, 0.6), '&:hover': { color: accent } },
        };
      }}
    />
  );
}

const editorSx = { display: 'flex', flexDirection: 'column', gap: 0.5 };

const chipsSx = { display: 'flex', flexWrap: 'wrap', gap: 0.3 };

const fieldRowSx = { display: 'flex', alignItems: 'center', gap: 0.5 };

const fieldSx = {
  flex: '1 1 auto',
  minWidth: 0,
  '& .MuiInputBase-input': { py: 0.4, fontSize: '0.68rem' },
};

const addSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.8,
  py: 0,
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};
