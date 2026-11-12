import { Box, Typography } from '@mui/material';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { RICH_TEXT_ACCENT } from '../../ui/entityColors.js';
import { FONT_SIZES, FONT_WEIGHTS } from '../../ui/fonts.js';

// A rule attached to a weapon, read on its card: a gold "Source — Rule" line
// over the rule's text (`children` stands in for text not loaded yet). The
// weapon's mastery (WeaponMasteryBlock) and its feat reminders below both.
export function WeaponRuleBlock({ title, entries, fontSize, sx, children }) {
  return (
    <Box sx={{ mt: 0.75, ...sx }}>
      <Typography sx={{ fontSize: FONT_SIZES.sm, color: RICH_TEXT_ACCENT, fontWeight: FONT_WEIGHTS.bold }}>
        {title}
      </Typography>
      {entries?.length ? <EntryBlocks entries={entries} fontSize={fontSize} emptyText="" /> : children}
    </Box>
  );
}

// Weapon-scoped rule reminders (sheetEffects.getWeaponNotes, e.g. Great Weapon
// Master: Heavy Weapon Mastery).
export function WeaponNoteBlock({ notes, fontSize, sx }) {
  if (!notes?.length) return null;
  return notes.map((note) => (
    <WeaponRuleBlock
      key={note.key}
      title={note.source && note.source !== note.title ? `${note.source} — ${note.title}` : note.title}
      entries={note.entries}
      fontSize={fontSize}
      sx={sx}
    />
  ));
}
