import { Fragment } from 'react';
import { Box, Button } from '@mui/material';
import { EntryBlocks } from './EntryBlocks.jsx';
import { entriesToHigherLevelBlocks } from './spellEntries.js';
import { getSpellMetaSegments } from './spellMeta.js';
import { isConcentrationSpell, isRitualSpell } from '../spellTags.js';

const META_LABEL_SX = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#9d7fb8',
  fontSize: '0.55rem',
  alignSelf: 'center',
};

const SECTION_HEADING_SX = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#9d7fb8',
  mb: 0.5,
};

// Casting Time / Range / Components / Duration as a two-column grid.
// Shared by the sheet spell card and the builder expanded body so the meta
// presentation stays identical. Renders nothing when the spell has no meta.
export function SpellMetaGrid({ spell, fontSize = '0.65rem', sx }) {
  const segments = getSpellMetaSegments(spell);
  if (!segments.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '8px', rowGap: '2px', fontSize, ...sx }}>
      {segments.map((segment) => (
        <Fragment key={segment.label}>
          <Box sx={META_LABEL_SX}>{segment.label}</Box>
          <Box sx={{ color: 'text.primary' }}>{segment.value}</Box>
        </Fragment>
      ))}
    </Box>
  );
}

// "Using a Higher-Level Spell Slot" upcast block. Accepts raw higher-level
// entries; renders nothing when absent/empty.
export function HigherLevelBlock({ entries, fontSize, sx }) {
  if (!entries) return null;
  const blocks = entriesToHigherLevelBlocks(entries);
  if (!blocks.length) return null;
  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider', ...sx }}>
      <Box sx={SECTION_HEADING_SX}>Using a Higher-Level Spell Slot</Box>
      <EntryBlocks blocks={blocks} fontSize={fontSize} emptyText="" />
    </Box>
  );
}

// Concentration (C) / Ritual (R) mini badges shown next to a spell name.
// Shared by every spell row (builder list + sheet picker dialog).
export function SpellMiniTags({ spell }) {
  const tags = [
    isConcentrationSpell(spell) ? { label: 'C', color: '#9d7fb8', bg: 'rgba(157,127,184,0.16)', title: 'Concentration' } : null,
    isRitualSpell(spell) ? { label: 'R', color: '#58b879', bg: 'rgba(63,166,108,0.14)', title: 'Ritual' } : null,
  ].filter(Boolean);
  if (!tags.length) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
      {tags.map((tag) => (
        <Box
          key={tag.label}
          title={tag.title}
          component="span"
          sx={{ border: 1, borderColor: tag.color, color: tag.color, bgcolor: tag.bg, borderRadius: '3px', px: '5px', py: '1px', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.55rem', fontWeight: 700, lineHeight: 1.25 }}
        >
          {tag.label}
        </Box>
      ))}
    </Box>
  );
}

// Add / Remove selection button for a spell row. `selected` flips it to a
// destructive Remove; `addColor` lets callers theme the Add state (builder uses
// primary, the sheet dialog uses success). Stops propagation so it doesn't also
// toggle the row's expand. Pass `sx` for context-specific sizing.
export function SpellSelectButton({ selected, disabled, onToggle, addColor = 'primary', sx }) {
  return (
    <Button
      size="small"
      variant={selected ? 'outlined' : 'contained'}
      color={selected ? 'error' : addColor}
      disabled={disabled}
      onClick={(event) => { event.stopPropagation(); onToggle(); }}
      sx={{ flexShrink: 0, minWidth: 56, px: '8px', py: '1px', fontSize: '0.62rem', lineHeight: 1.5, ...sx }}
    >
      {selected ? 'Remove' : 'Add'}
    </Button>
  );
}

// Read-only reference body for a spell: meta grid + description + upcast block.
// Used by the builder where there's no roll/interaction layer. (The sheet card
// composes SpellMetaGrid/HigherLevelBlock directly since it interleaves
// modifier groups and roll buttons between them.)
export function SpellReferenceBody({ spell, fontSize = '0.78rem' }) {
  const entries = spell?.descriptionEntries || spell?.entries;
  const higher = spell?.higherLevelEntries || spell?.entriesHigherLevel;
  return (
    <>
      <SpellMetaGrid spell={spell} sx={{ mb: '6px' }} />
      <EntryBlocks entries={entries} fontSize={fontSize} emptyText="" />
      <HigherLevelBlock entries={higher} fontSize={fontSize} />
    </>
  );
}
