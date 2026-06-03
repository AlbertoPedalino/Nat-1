import { Box, Stack, Typography } from '@mui/material';
import { RichInline } from './RichText.jsx';
import { entriesToTextBlocks } from './spellEntries.js';

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

// Shared renderer for 5etools entry blocks. Colors and text size are
// parametrized (defaults preserve the original spell/feature look) so callers
// that need a distinct tone — e.g. condition cards with accent effect names —
// reuse this single renderer instead of forking a parallel one.
export function EntryBlocks({
  blocks,
  entries,
  spacing = 0.65,
  emptyText = 'No description.',
  headingColor = 'text.primary',
  bodyColor = 'text.secondary',
  markerColor,
  fontSize,
}) {
  const resolved = Array.isArray(blocks) ? blocks : entriesToTextBlocks(entries);
  if (!resolved?.length) {
    return emptyText ? <Typography variant="body2" color="text.secondary" sx={{ fontSize }}>{emptyText}</Typography> : null;
  }
  const grouped = groupBlocks(resolved);

  return (
    <Stack spacing={spacing}>
      {grouped.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <Typography key={`h-${index}`} variant="body2" sx={{ fontWeight: 800, color: headingColor, lineHeight: 1.25, fontSize }}>
              {block.tokens?.length ? <RichInline tokens={block.tokens} keyPrefix={`h-${index}`} /> : block.text}
            </Typography>
          );
        }
        if (block.kind === 'listGroup') {
          return (
            <Box key={`lg-${index}`} component="ul" sx={{ m: 0, pl: 2.2, color: bodyColor }}>
              {block.items.map((item, itemIndex) => (
                <Typography key={`li-${index}-${itemIndex}`} component="li" variant="body2" sx={{ color: bodyColor, lineHeight: 1.38, fontSize, ...(markerColor ? { '&::marker': { color: markerColor } } : null) }}>
                  {item.tokens?.length ? <RichInline tokens={item.tokens} keyPrefix={`li-${index}-${itemIndex}`} /> : item.text}
                </Typography>
              ))}
            </Box>
          );
        }
        if (block.kind === 'table') {
          return (
            <Box key={`tbl-${index}`} sx={{ overflowX: 'auto' }}>
              {block.caption ? (
                <Typography variant="body2" sx={{ fontWeight: 800, color: headingColor, mb: 0.35, fontSize }}>
                  {block.caption}
                </Typography>
              ) : null}
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize || '0.72rem' }}>
                {block.headers?.length ? (
                  <Box component="thead">
                    <Box component="tr">
                      {block.headers.map((cell, cellIndex) => (
                        <Box key={`th-${cellIndex}`} component="th" sx={{ textAlign: 'left', p: '3px 6px', borderBottom: '1px solid', borderColor: 'divider', color: headingColor }}>
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
                        <Box key={`td-${rowIndex}-${cellIndex}`} component="td" sx={{ p: '3px 6px', borderBottom: '1px solid', borderColor: 'divider', color: bodyColor, verticalAlign: 'top' }}>
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
          <Typography key={`p-${index}`} variant="body2" sx={{ color: bodyColor, lineHeight: 1.42, fontSize }}>
            {block.tokens?.length ? <RichInline tokens={block.tokens} keyPrefix={`p-${index}`} /> : block.text}
          </Typography>
        );
      })}
    </Stack>
  );
}
