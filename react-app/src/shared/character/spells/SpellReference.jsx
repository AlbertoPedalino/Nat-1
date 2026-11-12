import { Box, Button, Typography } from '@mui/material';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { RichInline } from '../../content/RichText.jsx';
import { entriesToHigherLevelBlocks } from '../../content/entryText.js';
import { getSpellMetaSegments } from './spellMeta.js';
import { isConcentrationSpell, isRitualSpell } from './spellTags.js';
import { RICH_TEXT_ACCENT, SPELL_TAG_COLORS } from '../../ui/entityColors.js';
import MiniBadge from '../../ui/MiniBadge.jsx';
import { SpellNameIcon } from '../../content/FiveEToolsLink.jsx';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../ui/fonts.js';
import CardSection from '../../ui/CardSection.jsx';
import LabelValueGrid from '../../ui/LabelValueGrid.jsx';

// Casting Time / Range / Components / Duration as a two-column grid.
// Shared by the sheet spell card and the builder expanded body so the meta
// presentation stays identical. Renders nothing when the spell has no meta.
export function SpellMetaGrid({ spell, fontSize = FONT_SIZES.sm, sx }) {
  return <LabelValueGrid rows={getSpellMetaSegments(spell)} fontSize={fontSize} sx={sx} />;
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
  // shared rich-text section-heading style instead of duplicating it as a
  // plain white heading; fall back to a fixed label when the data has none.
  const headingIdx = blocks.findIndex((block) => block.kind === 'heading' && _REDUNDANT_HL_HEADING.test(String(block.text || '').trim()));
  const headingBlock = headingIdx >= 0 ? blocks[headingIdx] : null;
  const bodyBlocks = headingIdx >= 0 ? blocks.filter((_, i) => i !== headingIdx) : blocks;
  return (
    <CardSection
      tone={RICH_TEXT_ACCENT}
      title={headingBlock?.tokens?.length
        ? <RichInline tokens={headingBlock.tokens} keyPrefix="hl-heading" />
        : (headingBlock?.text || 'Using a Higher-Level Spell Slot')}
      sx={sx}
    >
      <EntryBlocks blocks={bodyBlocks} fontSize={fontSize} emptyText="" />
    </CardSection>
  );
}

// Concentration (C) / Ritual (R) mini badges shown next to a spell name.
// Shared by every spell row (builder list + sheet picker dialog).
export function SpellMiniTags({ spell, sx }) {
  const tags = [
    isConcentrationSpell(spell) ? { label: 'C', color: SPELL_TAG_COLORS.concentration, title: 'Concentration' } : null,
    isRitualSpell(spell) ? { label: 'R', color: SPELL_TAG_COLORS.ritual, title: 'Ritual' } : null,
  ].filter(Boolean);
  if (!tags.length) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ...sx }}>
      {tags.map((tag) => (
        <MiniBadge key={tag.label} label={tag.label} color={tag.color} title={tag.title} />
      ))}
    </Box>
  );
}

// Icon + name cluster shared by every spell row. Callers place concentration
// and ritual tags in their trailing-controls area.
export function SpellRowLabel({ spell, selected = false, showIcon = true, nameSx, sx }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
      {showIcon ? <SpellNameIcon spell={spell} /> : null}
      <Typography noWrap sx={{ minWidth: 0, fontWeight: selected ? FONT_WEIGHTS.bold : FONT_WEIGHTS.regular, color: 'text.primary', ...nameSx }}>
        {spell.name}
      </Typography>
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
      sx={{ flexShrink: 0, minWidth: 56, px: 1, py: 0.25, fontSize: FONT_SIZES.xs, lineHeight: LINE_HEIGHTS.normal, ...sx }}
    >
      {selected ? 'Remove' : 'Add'}
    </Button>
  );
}

// Read-only reference body for a spell: meta grid + description + upcast block.
// Used by the builder where there's no roll/interaction layer. (The sheet card
// composes SpellMetaGrid/HigherLevelBlock directly since it interleaves
// modifier groups and roll buttons between them.)
export function SpellReferenceBody({ spell, fontSize = FONT_SIZES.lg }) {
  const entries = spell?.descriptionEntries || spell?.entries;
  const higher = spell?.higherLevelEntries || spell?.entriesHigherLevel;
  return (
    <>
      <SpellMetaGrid spell={spell} sx={{ mb: 0.75 }} />
      <EntryBlocks entries={entries} fontSize={fontSize} emptyText="" />
      <HigherLevelBlock entries={higher} fontSize={fontSize} />
    </>
  );
}
