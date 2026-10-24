import { Box, Stack, Typography } from '@mui/material';
import { RichInline } from './RichText.jsx';
import { entriesToTextBlocks } from '../character/spells/spellEntries.js';
import { RICH_TEXT_ACCENT } from '../ui/entityColors.js';

// A sidebar or read-aloud box ('boxStart' … 'boxEnd', from entriesToTextBlocks
// with `boxes`) becomes one group holding its blocks. A box cut in two (a
// slice of a section) closes at the end; a stray end is dropped.
function groupBlocks(blocks) {
  const grouped = [];
  let listBuffer = null;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.kind === 'boxEnd') continue;
    if (block.kind === 'boxStart') {
      let level = 1;
      let end = index + 1;
      for (; end < blocks.length; end += 1) {
        if (blocks[end].kind === 'boxStart') level += 1;
        if (blocks[end].kind === 'boxEnd') level -= 1;
        if (!level) break;
      }
      listBuffer = null;
      grouped.push({ kind: 'boxGroup', variant: block.variant, blocks: blocks.slice(index + 1, end) });
      index = end;
      continue;
    }
    if (block.kind === 'listItem') {
      if (!listBuffer) {
        listBuffer = { kind: 'listGroup', items: [] };
        grouped.push(listBuffer);
      }
      listBuffer.items.push(block);
      continue;
    }
    listBuffer = null;
    grouped.push(block);
  }
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
  headingColor = RICH_TEXT_ACCENT,
  bodyColor = 'text.secondary',
  markerColor = RICH_TEXT_ACCENT,
  strongColor = RICH_TEXT_ACCENT,
  fontSize,
  headingFontSize = fontSize,
}) {
  const resolved = Array.isArray(blocks) ? blocks : entriesToTextBlocks(entries);
  if (!resolved?.length) {
    return emptyText ? <Typography variant="body2" color="text.secondary" sx={{ fontSize }}>{emptyText}</Typography> : null;
  }
  const grouped = groupBlocks(resolved);

  return (
    <Stack spacing={spacing}>
      {grouped.map((block, index) => {
        if (block.kind === 'boxGroup') {
          return (
            <Box key={`box-${index}`} sx={block.variant === 'readaloud' ? readAloudBoxSx : insetBoxSx}>
              <EntryBlocks
                blocks={block.blocks}
                spacing={spacing}
                emptyText=""
                headingColor={headingColor}
                bodyColor={block.variant === 'readaloud' ? 'text.primary' : bodyColor}
                markerColor={markerColor}
                strongColor={strongColor}
                fontSize={fontSize}
                headingFontSize={headingFontSize}
              />
            </Box>
          );
        }
        if (block.kind === 'heading') {
          return (
            <Typography key={`h-${index}`} variant="body2" sx={{ fontWeight: 800, color: headingColor, lineHeight: 1.25, fontSize: headingFontSize }}>
              {block.tokens?.length ? <RichInline tokens={block.tokens} keyPrefix={`h-${index}`} strongColor={strongColor} /> : block.text}
            </Typography>
          );
        }
        if (block.kind === 'listGroup') {
          return (
            <Box key={`lg-${index}`} component="ul" sx={{ m: 0, pl: 2.2, color: bodyColor }}>
              {block.items.map((item, itemIndex) => (
                <Typography key={`li-${index}-${itemIndex}`} component="li" variant="body2" sx={{ color: bodyColor, lineHeight: 1.38, fontSize, ...(markerColor ? { '&::marker': { color: markerColor } } : null) }}>
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
                <Typography variant="body2" sx={{ fontWeight: 800, color: headingColor, mb: 0.35, fontSize: headingFontSize }}>
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
        if (block.kind === 'image') {
          const caption = [block.title, block.credit ? `Art: ${block.credit}` : ''].filter(Boolean).join(' — ');
          return (
            <Box key={`img-${index}`} component="figure" sx={{ m: 0, textAlign: 'center' }}>
              <Box
                component="img"
                src={block.src}
                alt={block.title || ''}
                loading="lazy"
                width={block.width || undefined}
                height={block.height || undefined}
                sx={{ maxWidth: '100%', maxHeight: 480, width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 1 }}
              />
              {caption ? (
                <Typography component="figcaption" variant="caption" sx={{ display: 'block', color: 'text.secondary', fontStyle: 'italic', mt: 0.25 }}>
                  {caption}
                </Typography>
              ) : null}
            </Box>
          );
        }
        return (
          <Typography key={`p-${index}`} variant="body2" sx={{ color: bodyColor, lineHeight: 1.42, fontSize }}>
            {block.tokens?.length ? <RichInline tokens={block.tokens} keyPrefix={`p-${index}`} strongColor={strongColor} /> : block.text}
          </Typography>
        );
      })}
    </Stack>
  );
}

// Read-aloud text: the book's tinted box with a rule down its side.
const readAloudBoxSx = {
  borderLeft: '3px solid',
  borderColor: 'primary.main',
  bgcolor: 'action.hover',
  px: 1.5,
  py: 1,
  borderRadius: 1,
};

// A sidebar: set apart, framed.
const insetBoxSx = {
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'action.hover',
  px: 1.5,
  py: 1,
  borderRadius: 1,
};
