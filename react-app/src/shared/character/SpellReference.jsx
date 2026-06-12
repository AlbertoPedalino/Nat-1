import { Fragment } from 'react';
import { alpha, Box, Button, Typography } from '@mui/material';
import { EntryBlocks } from './EntryBlocks.jsx';
import { RichInline } from './RichText.jsx';
import { entriesToHigherLevelBlocks } from './spellEntries.js';
import { getSpellMetaSegments } from './spellMeta.js';
import { isConcentrationSpell, isRitualSpell } from '../spellTags.js';
import { SPELL_TAG_COLORS } from '../entityColors.js';
import MiniBadge from './MiniBadge.jsx';
import { SpellNameIcon } from './FiveEToolsLink.jsx';

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
const _REDUNDANT_HL_HEADING = /^(using a higher[- ]level spell slot|at higher levels)\.?$/i;

export function HigherLevelBlock({ entries, fontSize, sx }) {
  if (!entries) return null;
  const blocks = entriesToHigherLevelBlocks(entries);
  if (!blocks.length) return null;
  // 5etools tags the higher-level block with its own "Using a Higher-Level
  // Spell Slot" name. Pull that heading out and render it live through the
  // section-heading style (Cinzel / violet) instead of duplicating it as a
  // plain white heading; fall back to a fixed label when the data has none.
  const headingIdx = blocks.findIndex((block) => block.kind === 'heading' && _REDUNDANT_HL_HEADING.test(String(block.text || '').trim()));
  const headingBlock = headingIdx >= 0 ? blocks[headingIdx] : null;
  const bodyBlocks = headingIdx >= 0 ? blocks.filter((_, i) => i !== headingIdx) : blocks;
  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider', ...sx }}>
      <Box sx={SECTION_HEADING_SX}>
        {headingBlock?.tokens?.length
          ? <RichInline tokens={headingBlock.tokens} keyPrefix="hl-heading" />
          : (headingBlock?.text || 'Using a Higher-Level Spell Slot')}
      </Box>
      <EntryBlocks blocks={bodyBlocks} fontSize={fontSize} emptyText="" />
    </Box>
  );
}

// Concentration (C) / Ritual (R) mini badges shown next to a spell name.
// Shared by every spell row (builder list + sheet picker dialog).
export function SpellMiniTags({ spell }) {
  const tags = [
    isConcentrationSpell(spell) ? { label: 'C', color: SPELL_TAG_COLORS.concentration, bg: alpha(SPELL_TAG_COLORS.concentration, 0.16), title: 'Concentration' } : null,
    isRitualSpell(spell) ? { label: 'R', color: SPELL_TAG_COLORS.ritual, bg: alpha(SPELL_TAG_COLORS.ritual, 0.16), title: 'Ritual' } : null,
  ].filter(Boolean);
  if (!tags.length) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
      {tags.map((tag) => (
        <MiniBadge key={tag.label} label={tag.label} color={tag.color} bg={tag.bg} title={tag.title} />
      ))}
    </Box>
  );
}

// Icon + name + concentration/ritual tags cluster shared by every spell row
// (builder choice panels, builder selection panel, sheet picker dialog). Callers
// supply their own row container and trailing control (select button, source chip).
// `showIcon=false` hides the 5e.tools link (compact rows); `nameSx` themes the name.
export function SpellRowLabel({ spell, selected = false, showIcon = true, nameSx, sx }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
      {showIcon ? <SpellNameIcon spell={spell} /> : null}
      <Typography noWrap sx={{ minWidth: 0, fontWeight: selected ? 700 : 500, color: 'text.primary', ...nameSx }}>
        {spell.name}
      </Typography>
      <SpellMiniTags spell={spell} />
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
