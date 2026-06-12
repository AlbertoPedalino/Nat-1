import { Box, Typography } from '@mui/material';
import { tokenizeInlineMarkup } from './spellEntries.js';
import { RICH_TEXT_ACCENT } from '../entityColors.js';

function renderTokens(tokens, keyPrefix, { strongColor, refColor } = {}) {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === 'em') {
      return <Box key={key} component="em" sx={{ fontStyle: 'italic' }}>{token.text}</Box>;
    }
    if (token.type === 'strong') {
      return <Box key={key} component="strong" sx={{ fontWeight: 700, color: strongColor || 'text.primary' }}>{token.text}</Box>;
    }
    if (token.type === 'ref') {
      return <Box key={key} component="span" sx={{ color: refColor }}>{token.text}</Box>;
    }
    return <Box key={key} component="span">{token.text}</Box>;
  });
}

export function RichInline({
  text,
  tokens,
  keyPrefix = 't',
  strongColor = RICH_TEXT_ACCENT,
  refColor = RICH_TEXT_ACCENT,
}) {
  const resolved = Array.isArray(tokens) && tokens.length ? tokens : tokenizeInlineMarkup(text);
  if (!resolved.length) return null;
  return renderTokens(resolved, keyPrefix, { strongColor, refColor });
}

export function RichText({ text, sx, variant = 'body2', color = 'text.secondary', lineHeight = 1.42 }) {
  const raw = String(text ?? '');
  if (!raw.trim()) return null;
  const paragraphs = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!paragraphs.length) return null;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', ...sx }}>
      {paragraphs.map((paragraph, index) => (
        <Typography key={`rt-${index}`} variant={variant} color={color} sx={{ lineHeight }}>
          <RichInline text={paragraph} keyPrefix={`rt-${index}`} />
        </Typography>
      ))}
    </Box>
  );
}
