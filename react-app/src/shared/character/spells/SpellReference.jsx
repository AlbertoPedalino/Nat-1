import { Box, Button } from '@mui/material';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { RichInline } from '../../content/RichText.jsx';
import { entriesToHigherLevelBlocks } from '../../content/entryText.js';
import { getSpellMetaSegments, spellCastUnit } from './spellMeta.js';
import ToneBar from '../../ui/ToneBar.jsx';
import ScrollingName from '../../ui/ScrollingName.jsx';
import PickableRow from '../../ui/PickableRow.jsx';
import { PICK_ACTION_SX } from '../../ui/entryCard.js';
import { cardTitleSx } from '../../ui/PanelHeader.jsx';
import { isConcentrationSpell, isRitualSpell } from './spellTags.js';
import { ACTION_COLORS, RICH_TEXT_ACCENT, SPELL_TAG_COLORS } from '../../ui/entityColors.js';
import MiniBadge from '../../ui/MiniBadge.jsx';
import { SpellNameIcon } from '../../content/FiveEToolsLink.jsx';
import { FONT_SIZES } from '../../ui/fonts.js';
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

// A spell's casting time as an action card's category: a minute or more is
// the actions' "Other".
const CAST_UNIT_CATEGORY = Object.freeze({ action: 'action', bonus: 'bonus', reaction: 'reaction', other: 'special' });

// The head of every spell, owned or pickable (shared/ui/entryCard.js): what
// casting it takes as its bar (as an action card's category), its 5etools
// link icon, and its name in the card face, scrolling where it is cut.
export function SpellCardTitle({ spell, showIcon = true, sx }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, ...sx }}>
      <ToneBar tone={ACTION_COLORS[CAST_UNIT_CATEGORY[spellCastUnit(spell)]] || null} />
      {showIcon ? <SpellNameIcon spell={spell} /> : null}
      <ScrollingName sx={cardTitleSx}>{spell.name}</ScrollingName>
    </Box>
  );
}
// A spell in a picker row (the builder's lists, the sheet's picker and the
// wizard's spellbook), in two lines: its name with its `control` (Add/Remove)
// at the right on the first; where it comes from (`source`: a class's or
// feat's chip, AUTO) at the left and its Concentration/Ritual tags at the
// right on the second. One layout, so every picker row lines up the same.
export function SpellRowLabel({ spell, showIcon = true, source = null, control = null, sx }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 1, rowGap: 0.75, ...sx }}>
      <SpellCardTitle spell={spell} showIcon={showIcon} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>{control}</Box>
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>{source}</Box>
      <SpellMiniTags spell={spell} sx={{ justifySelf: 'end' }} />
    </Box>
  );
}

// A spell offered to take (shared/ui/entryCard.js), in every picker: the
// sheet's, the wizard's spellbook, the builder's lists. Its head and tags
// (SpellRowLabel), Add/Remove at the right unless it cannot be changed
// (`locked`), its reference opened below. `source` is where a granted spell
// comes from (a chip); `dimmed`, a spell the full list cannot take now.
export function PickableSpellRow({ spell, selected = false, disabled = false, dimmed = false, locked = false, source = null, onToggle }) {
  return (
    <PickableRow selected={selected} dimmed={dimmed} details={<SpellReferenceBody spell={spell} />}>
      <SpellRowLabel
        spell={spell}
        source={source}
        control={locked ? null : <SpellSelectButton selected={selected} disabled={disabled} onToggle={onToggle} />}
      />
    </PickableRow>
  );
}

// Add / Remove selection button for a spell row (PICK_ACTION_SX, as every
// picker's action). `selected` flips it to a destructive Remove. Stops
// propagation so it doesn't also toggle the row's expand.
export function SpellSelectButton({ selected, disabled, onToggle }) {
  return (
    <Button
      size="small"
      variant={selected ? 'outlined' : 'contained'}
      color={selected ? 'error' : 'primary'}
      disabled={disabled}
      onClick={(event) => { event.stopPropagation(); onToggle(); }}
      sx={PICK_ACTION_SX}
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
