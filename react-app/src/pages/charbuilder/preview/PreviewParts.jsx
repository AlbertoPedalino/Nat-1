import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import PanelHeader, { panelBodySx } from '../../../shared/ui/PanelHeader.jsx';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { EntryAccordion } from '../../../shared/content/EntryAccordion.jsx';
import { splitNamedEntries } from '../../../shared/content/entryStructure.js';
import { ENTITY_COLORS as SOURCE_COLOR, chipTintStyle } from '../../../shared/ui/entityColors.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { BUILDER_TEXT } from '../layout/builderText.js';

// The builder preview's building blocks: section cards, chip lists, inline
// metadata and feature accordions.


export const PROFICIENCY_TONE = UI_COLORS.accentText;

function EmptyCaption({ children }) {
  return (
    <Typography sx={BUILDER_TEXT.hint}>
      {children}
    </Typography>
  );
}

// A preview section: the sheet's panel (PanelHeader over the body), its
// `subtitle` the first line of the body.
export function PreviewSection({ icon, title, subtitle, tone = UI_COLORS.accentText, children, emptyText }) {
  const hasContent = Boolean(children);
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', minWidth: 0 }}>
      <PanelHeader icon={icon} title={title} tone={tone} titleSx={BUILDER_TEXT.panelTitle} />
      <Stack spacing={0.75} sx={{ ...panelBodySx, minWidth: 0 }}>
        {subtitle ? (
          <Typography sx={BUILDER_TEXT.note} noWrap>{subtitle}</Typography>
        ) : null}
        {hasContent ? children : emptyText ? <EmptyCaption>{emptyText}</EmptyCaption> : null}
      </Stack>
    </Paper>
  );
}

export function InlineMetadata({ items }) {
  const visibleItems = items.filter((item) => item.value != null && item.value !== '');
  if (!visibleItems.length) return null;

  return (
    <Typography sx={{ ...BUILDER_TEXT.itemMeta, lineHeight: LINE_HEIGHTS.tight }}>
      {visibleItems.map((item, index) => (
        <Box component="span" key={item.key}>
          {index > 0 ? (
            <Box component="span" aria-hidden="true" sx={{ mx: 0.75, color: 'text.disabled' }}>
              ·
            </Box>
          ) : null}
          <Box component="span" sx={item.sx}>
            {item.value}
          </Box>
        </Box>
      ))}
    </Typography>
  );
}

export function PreviewChipList({ items, tone = PROFICIENCY_TONE, getKey = (item) => item, getLabel = (item) => item }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
      {items.map((item) => (
        <Chip
          key={getKey(item)}
          size="small"
          variant="outlined"
          label={getLabel(item)}
          sx={{
            ...chipTintStyle(tone),
            flex: '0 1 auto',
            minWidth: 0,
            height: CONTROL_HEIGHTS.sm,
            maxWidth: '100%',
            '& .MuiChip-label': {
              ...BUILDER_TEXT.chip,
              color: tone,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
        />
      ))}
    </Box>
  );
}

// Shared 5etools entry renderer at the preview's compact type scale.
export function PreviewEntryText({ entries }) {
  return (
    <Box sx={{ minWidth: 0, wordBreak: 'break-word', '& .MuiTypography-root': { ...BUILDER_TEXT.body, lineHeight: LINE_HEIGHTS.normal } }}>
      <EntryBlocks entries={entries} emptyText="" />
    </Box>
  );
}

function getFeatureBody(feature) {
  if (!feature || typeof feature !== 'object') return feature;
  if (feature.entries != null) return feature.entries;
  if (feature.entry != null) return feature.entry;
  if (feature.type === 'list' || feature.type === 'table') {
    const { name, ...body } = feature;
    return body;
  }
  if (feature.items != null) return feature.items;
  if (feature.rows != null) return feature.rows;
  return null;
}

// Preview-pane feature row: compact accordion backed solely by canonical
// feature entries. Runtime action/resource metadata belongs to the sheet.
export function FeatureAccordion({ feature, source, children }) {
  const tone = SOURCE_COLOR[source] || SOURCE_COLOR.class;
  const body = getFeatureBody(feature);
  const hasDefaultBody = Array.isArray(body) ? body.length > 0 : body != null && body !== '';
  return (
    <EntryAccordion title={feature.name} tone={tone} titleColor={tone} dense>
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        {children != null ? children : hasDefaultBody ? <PreviewEntryText entries={body} /> : (
          <Typography component="div" sx={{ ...BUILDER_TEXT.hint, wordBreak: 'break-word' }}>
            No description.
          </Typography>
        )}
      </Stack>
    </EntryAccordion>
  );
}

// Named 5etools entries as collapsed accordion rows (description only on
// expand); unnamed intro text is grouped under a leading "Description" row.
export function EntryAccordions({ source, entries }) {
  return splitNamedEntries(entries).map((feature, index) => (
    <FeatureAccordion key={`${feature.name}-${index}`} feature={feature} source={source} />
  ));
}

export function hasDescriptionEntries(entries) {
  if (entries == null || entries === '') return false;
  return !Array.isArray(entries) || entries.length > 0;
}
