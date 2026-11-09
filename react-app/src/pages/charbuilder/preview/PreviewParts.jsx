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
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The builder preview's building blocks: section cards, chip lists, inline
// metadata and feature accordions.

const darkChipText = UI_COLORS.onAccent;

export const PROFICIENCY_TONE = NEUTRAL_TONE;

export const SECTION_CARD_SX = {
  minWidth: 0,
  borderColor: uiAlpha(UI_COLORS.accentText, OPACITY.fill),
  bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
  backgroundImage: 'none',
};

export const SECTION_HEADER_SX = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.sm,
  lineHeight: 1.2,
};

function EmptyCaption({ children }) {
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: FONT_SIZES.md, lineHeight: 1.45 }}>
      {children}
    </Typography>
  );
}

export function PreviewSection({ icon: Icon, title, subtitle, tone = NEUTRAL_TONE, children, emptyText }) {
  const hasContent = Boolean(children);
  return (
    <Card variant="outlined" sx={SECTION_CARD_SX}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            {Icon ? <Icon size={ICON_SIZES.sm} color={tone} /> : null}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ ...SECTION_HEADER_SX, color: tone }} noWrap>
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: FONT_SIZES.sm, lineHeight: 1.2 }} noWrap>
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
    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: FONT_SIZES.md, lineHeight: 1.2 }}>
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

export function filledChipSx(bg) {
  return {
    backgroundColor: bg,
    color: darkChipText,
    fontWeight: FONT_WEIGHTS.bold,
    border: `1px solid ${uiAlpha(UI_COLORS.accentHighlight, OPACITY.heavy)}`,
    boxShadow: `0 0 0 1px ${uiAlpha(UI_COLORS.black, OPACITY.line)} inset`,
    '& .MuiChip-label': { color: darkChipText },
  };
}

function outlinedChipSx(color) {
  return {
    color,
    borderColor: color,
    fontWeight: FONT_WEIGHTS.bold,
    '& .MuiChip-label': { color },
  };
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
              fontSize: FONT_SIZES.xs,
              fontWeight: FONT_WEIGHTS.bold,
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
    <Box sx={{ minWidth: 0, wordBreak: 'break-word', '& .MuiTypography-root': { fontSize: FONT_SIZES.lg, lineHeight: 1.45 } }}>
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
          <Typography variant="caption" component="div" sx={{ color: 'text.secondary', lineHeight: 1.45, wordBreak: 'break-word' }}>
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
