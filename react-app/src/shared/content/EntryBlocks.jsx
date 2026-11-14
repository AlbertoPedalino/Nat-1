import { Box, Stack, Typography } from '@mui/material';
import { RichInline } from './RichText.jsx';
import { entriesToTextBlocks } from './entryText.js';
import { RICH_TEXT_ACCENT } from '../ui/entityColors.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../ui/fonts.js';
import {
  RULE_INSET_SX, RULE_INSET_TITLE_SX, RULE_LIST_SX, RULE_TABLE_SX,
} from '../ui/ruleText.js';
import { TEXT_STYLES } from '../ui/textStyles.js';
import { LIST_ROW_RULE_SX } from '../../shared/ui/interactive.js';

function groupBlocks(blocks) {
  const grouped = [];
  let listBuffer = null;
  blocks.forEach((block) => {
    if (block.kind === 'listItem') {
      if (!listBuffer) {
        listBuffer = { kind: 'listGroup', items: [] };
        grouped.push(listBuffer);
      }
      listBuffer.items.push(block);
      return;
    }
    listBuffer = null;
    grouped.push(block);
  });
  return grouped;
}

// Shared renderer for 5etools entry blocks, set as every rule's text is
// (ruleText.js: a list's diamonds, a boxed text's paper, a table's head and
// stripes). Colors and text size are
// parametrized (defaults preserve the original spell/feature look) so callers
// that need a distinct tone — e.g. condition cards with accent effect names —
// reuse this single renderer instead of forking a parallel one.
export function EntryBlocks({
  blocks,
  entries,
  spacing = 0.65,
  emptyText = 'No description.',
  headingColor = RICH_TEXT_ACCENT,
  bodyColor = 'text.secondary',
  strongColor = RICH_TEXT_ACCENT,
  fontSize,
  headingFontSize = fontSize,
}) {
  const resolved = Array.isArray(blocks) ? blocks : entriesToTextBlocks(entries);
  if (!resolved?.length) {
    return emptyText ? <Typography variant="body2" sx={{ color: 'text.secondary', fontSize }}>{emptyText}</Typography> : null;
  }
  const grouped = groupBlocks(resolved);

  return (
    // Descriptive text, read as a rulebook's (TEXT_STYLES.prose); inline
    // controls (roll pills) keep their own lettering.
    <Stack spacing={spacing} sx={{ '& .MuiTypography-root': TEXT_STYLES.prose }}>
      {grouped.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <Typography key={`h-${index}`} variant="body2" sx={{ fontWeight: FONT_WEIGHTS.heavy, color: headingColor, lineHeight: LINE_HEIGHTS.snug, fontSize: headingFontSize }}>
              {block.tokens?.length ? <RichInline tokens={block.tokens} keyPrefix={`h-${index}`} strongColor={strongColor} /> : block.text}
            </Typography>
          );
        }
        if (block.kind === 'inset') {
          return (
            <Box key={`in-${index}`} sx={RULE_INSET_SX}>
              {block.title ? <Typography sx={RULE_INSET_TITLE_SX}>{block.title}</Typography> : null}
              <EntryBlocks blocks={block.blocks} spacing={spacing} emptyText={null} headingColor="inherit" bodyColor="inherit" strongColor="inherit" fontSize={fontSize} />
            </Box>
          );
        }
        if (block.kind === 'listGroup') {
          return (
            <Box key={`lg-${index}`} component="ul" sx={[RULE_LIST_SX, { color: bodyColor }]}>
              {block.items.map((item, itemIndex) => (
                <Typography key={`li-${index}-${itemIndex}`} component="li" variant="body2" sx={{ color: bodyColor, lineHeight: LINE_HEIGHTS.normal, fontSize }}>
                  {item.tokens?.length ? <RichInline tokens={item.tokens} keyPrefix={`li-${index}-${itemIndex}`} strongColor={strongColor} /> : item.text}
                </Typography>
              ))}
            </Box>
          );
        }
        if (block.kind === 'table') {
          return (
            <Box key={`tbl-${index}`} sx={{ overflowX: 'auto' }}>
              {block.caption ? (
                <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHTS.heavy, color: headingColor, mb: 0.25, fontSize: headingFontSize }}>
                  {block.caption}
                </Typography>
              ) : null}
              <Box component="table" sx={[RULE_TABLE_SX, { width: '100%', borderCollapse: 'collapse', fontSize: fontSize || FONT_SIZES.md }]}>
                {block.headers?.length ? (
                  <Box component="thead">
                    <Box component="tr">
                      {block.headers.map((cell, cellIndex) => (
                        <Box key={`th-${cellIndex}`} component="th" sx={{ textAlign: 'left', p: '3px 6px', ...LIST_ROW_RULE_SX, color: headingColor }}>
                          {cell}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : null}
                <Box component="tbody">
                  {(block.rows || []).map((row, rowIndex) => (
                    <Box key={`tr-${rowIndex}`} component="tr">
                      {row.map((cell, cellIndex) => (
                        <Box key={`td-${rowIndex}-${cellIndex}`} component="td" sx={{ p: '3px 6px', ...LIST_ROW_RULE_SX, color: bodyColor, verticalAlign: 'top' }}>
                          {cell}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          );
        }
        return (
          <Typography key={`p-${index}`} variant="body2" sx={{ color: bodyColor, lineHeight: LINE_HEIGHTS.normal, fontSize }}>
            {block.tokens?.length ? <RichInline tokens={block.tokens} keyPrefix={`p-${index}`} strongColor={strongColor} /> : block.text}
          </Typography>
        );
      })}
    </Stack>
  );
}
