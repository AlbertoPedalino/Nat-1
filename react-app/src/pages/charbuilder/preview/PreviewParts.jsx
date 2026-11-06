import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { EntryAccordion } from '../../../shared/content/EntryAccordion.jsx';
import { splitNamedEntries } from '../../../shared/content/entryStructure.js';
import { ENTITY_COLORS as SOURCE_COLOR, NEUTRAL_TONE } from '../../../shared/ui/entityColors.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';

// The builder preview's building blocks: section cards, chip lists, inline
// metadata and feature accordions.

export const darkChipText = UI_COLORS.primaryContrast;

export const PROFICIENCY_TONE = NEUTRAL_TONE;

export const SECTION_CARD_SX = {
  minWidth: 0,
  borderColor: uiAlpha(UI_COLORS.goldLight, 0.18),
  bgcolor: uiAlpha(UI_COLORS.white, 0.025),
  backgroundImage: 'none',
};

export const SECTION_HEADER_SX = {
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: '0.66rem',
  fontWeight: 800,
  lineHeight: 1.2,
};

export function EmptyCaption({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.45 }}>
      {children}
    </Typography>
  );
}

export function PreviewSection({ icon: Icon, title, subtitle, tone = NEUTRAL_TONE, children, emptyText }) {
  const hasContent = Boolean(children);
  return (
    <Card variant="outlined" sx={SECTION_CARD_SX}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack spacing={0.85} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            {Icon ? <Icon size={15} color={tone} /> : null}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ ...SECTION_HEADER_SX, color: tone }} noWrap>
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', lineHeight: 1.2 }} noWrap>
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          {hasContent ? children : emptyText ? <EmptyCaption>{emptyText}</EmptyCaption> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function InlineMetadata({ items }) {
  const visibleItems = items.filter((item) => item.value != null && item.value !== '');
  if (!visibleItems.length) return null;

  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.2 }}>
      {visibleItems.map((item, index) => (
        <Box component="span" key={item.key}>
          {index > 0 ? (
            <Box component="span" aria-hidden="true" sx={{ mx: 0.65, color: 'text.disabled' }}>
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

export function filledChipSx(bg) {
  return {
    backgroundColor: bg,
    color: darkChipText,
    fontWeight: 700,
    border: `1px solid ${uiAlpha(UI_COLORS.goldPale, 0.65)}`,
    boxShadow: `0 0 0 1px ${uiAlpha(UI_COLORS.black, 0.28)} inset`,
    '& .MuiChip-label': { color: darkChipText },
  };
}

export function outlinedChipSx(color) {
  return {
    color,
    borderColor: color,
    fontWeight: 700,
    '& .MuiChip-label': { color },
  };
}

export function PreviewChipList({ items, tone = PROFICIENCY_TONE, getKey = (item) => item, getLabel = (item) => item }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.45, mt: 0.45, width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
      {items.map((item) => (
        <Chip
          key={getKey(item)}
          size="small"
          variant="outlined"
          label={getLabel(item)}
          sx={{
            ...outlinedChipSx(tone),
            flex: '0 1 auto',
            minWidth: 0,
            height: 20,
            maxWidth: '100%',
            '& .MuiChip-label': {
              color: tone,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.61rem',
              fontWeight: 700,
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
    <Box sx={{ minWidth: 0, wordBreak: 'break-word', '& .MuiTypography-root': { fontSize: '0.75rem', lineHeight: 1.45 } }}>
      <EntryBlocks entries={entries} emptyText="" />
    </Box>
  );
}

export function getFeatureBody(feature) {
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
          <Typography variant="caption" component="div" color="text.secondary" sx={{ lineHeight: 1.45, wordBreak: 'break-word' }}>
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
