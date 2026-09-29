import { Box, Typography } from '@mui/material';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { RICH_TEXT_ACCENT } from '../../ui/entityColors.js';

// Weapon-scoped rule reminders (sheetEffects.getWeaponNotes, e.g. Great Weapon
// Master: Heavy Weapon Mastery), styled like the WeaponMasteryBlock 'tag'
// variant so both read as rules attached to the weapon: "Source — Rule" + text.
export function WeaponNoteBlock({ notes, fontSize, sx }) {
  if (!notes?.length) return null;
  return notes.map((note) => (
    <Box key={note.key} sx={{ mt: 0.7, ...sx }}>
      <Typography sx={{ fontSize: '0.66rem', color: RICH_TEXT_ACCENT, fontWeight: 700 }}>
        {note.source && note.source !== note.title ? `${note.source} — ${note.title}` : note.title}
      </Typography>
      {note.entries?.length ? <EntryBlocks entries={note.entries} fontSize={fontSize} emptyText="" /> : null}
    </Box>
  ));
}
